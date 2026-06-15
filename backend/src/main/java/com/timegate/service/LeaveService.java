package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.*;
import com.timegate.dto.LeaveDtos.*;
import com.timegate.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LeaveService {

    private final LeaveTypeRepository types;
    private final LeaveRequestRepository requests;
    private final LeaveBalanceRepository balances;
    private final EmployeeRepository employees;
    private final DepartmentRepository departments;
    private final NotificationService notifications;
    private final AuditService audit;

    public LeaveService(LeaveTypeRepository types, LeaveRequestRepository requests,
                        LeaveBalanceRepository balances, EmployeeRepository employees,
                        DepartmentRepository departments, NotificationService notifications,
                        AuditService audit) {
        this.types = types;
        this.requests = requests;
        this.balances = balances;
        this.employees = employees;
        this.departments = departments;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<LeaveTypeDto> listTypes() {
        return types.findAll().stream().map(LeaveTypeDto::from).toList();
    }

    @Transactional
    public LeaveTypeDto createType(LeaveTypeCreate req) {
        LeaveType t = new LeaveType();
        applyType(t, req);
        return LeaveTypeDto.from(types.save(t));
    }

    @Transactional
    public LeaveTypeDto updateType(Long id, LeaveTypeCreate req) {
        LeaveType t = types.findById(id)
            .orElseThrow(() -> ApiException.notFound("Ta'til turi topilmadi: " + id));
        applyType(t, req);
        return LeaveTypeDto.from(types.save(t));
    }

    @Transactional
    public void deleteType(Long id) {
        if (!types.existsById(id)) throw ApiException.notFound("Ta'til turi topilmadi: " + id);
        if (requests.countByLeaveTypeId(id) > 0 || balances.countByLeaveTypeId(id) > 0)
            throw ApiException.conflict("in_use", "Bu ta'til turi so'rov yoki balansda ishlatilgan — o'chirib bo'lmaydi.");
        types.deleteById(id);
    }

    private void applyType(LeaveType t, LeaveTypeCreate req) {
        t.setName(req.name());
        t.setIsPaid(req.isPaid() == null ? Boolean.TRUE : req.isPaid());
        t.setDefaultDays(req.defaultDays() == null ? 0 : req.defaultDays());
    }

    @Transactional
    public LeaveRequestDto create(LeaveRequestCreate req) {
        if (req.dateTo().isBefore(req.dateFrom()))
            throw ApiException.badRequest("date_to must be on or after date_from.");
        Employee emp = employees.findById(req.employeeId())
            .orElseThrow(() -> ApiException.notFound("Employee not found: " + req.employeeId()));
        types.findById(req.leaveTypeId())
            .orElseThrow(() -> ApiException.notFound("Leave type not found: " + req.leaveTypeId()));

        LeaveRequest r = new LeaveRequest();
        r.setEmployeeId(req.employeeId());
        r.setLeaveTypeId(req.leaveTypeId());
        r.setDateFrom(req.dateFrom());
        r.setDateTo(req.dateTo());
        r.setDays(BigDecimal.valueOf(ChronoUnit.DAYS.between(req.dateFrom(), req.dateTo()) + 1));
        r.setReason(req.reason());
        r.setStatus("pending");
        final LeaveRequest saved = requests.save(r);

        // Notify the department manager (if any) + all admins
        String who = emp.getLastName() + " " + emp.getFirstName();
        String msg = who + " " + saved.getDays() + " kunlik ta'til so'rovi yubordi.";
        if (emp.getDepartmentId() != null) {
            departments.findById(emp.getDepartmentId()).ifPresent(d ->
                notifications.notifyEmployee(d.getManagerId(), "Yangi ta'til so'rovi", msg));
        }
        notifications.notifyAdmins("Yangi ta'til so'rovi", msg);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> list(String status, Long employeeId) {
        return requests.search(status, employeeId).stream().map(this::toDto).toList();
    }

    @Transactional
    public LeaveRequestDto decide(Long id, LeaveDecision decision, Long approverUserId) {
        LeaveRequest r = requests.findById(id)
            .orElseThrow(() -> ApiException.notFound("Leave request not found: " + id));
        if (!"pending".equals(r.getStatus()))
            throw ApiException.conflict("already_decided", "Request is already " + r.getStatus() + ".");
        String d = decision.decision();
        if (!"approved".equals(d) && !"rejected".equals(d))
            throw ApiException.badRequest("decision must be 'approved' or 'rejected'.");

        r.setStatus(d);
        r.setApproverId(approverUserId);
        r.setDecidedAt(OffsetDateTime.now());
        requests.save(r);

        if ("approved".equals(d)) {
            applyBalance(r);
        }
        audit.record("LEAVE_" + d.toUpperCase(), "leave_request", id,
            Map.of("employeeId", r.getEmployeeId(), "days", r.getDays()));
        // Notify the requesting employee
        notifications.notifyEmployee(r.getEmployeeId(),
            "Ta'til so'rovi " + ("approved".equals(d) ? "tasdiqlandi" : "rad etildi"),
            "Davr: " + r.getDateFrom() + " — " + r.getDateTo()
                + (decision.comment() != null ? ". Izoh: " + decision.comment() : ""));
        return toDto(r);
    }

    private void applyBalance(LeaveRequest r) {
        short year = (short) r.getDateFrom().getYear();
        LeaveBalance b = balances
            .findByEmployeeIdAndLeaveTypeIdAndYear(r.getEmployeeId(), r.getLeaveTypeId(), year)
            .orElseGet(() -> {
                LeaveBalance nb = new LeaveBalance();
                nb.setEmployeeId(r.getEmployeeId());
                nb.setLeaveTypeId(r.getLeaveTypeId());
                nb.setYear(year);
                BigDecimal entitled = types.findById(r.getLeaveTypeId())
                    .map(t -> BigDecimal.valueOf(t.getDefaultDays() == null ? 0 : t.getDefaultDays()))
                    .orElse(BigDecimal.ZERO);
                nb.setEntitledDays(entitled);
                nb.setUsedDays(BigDecimal.ZERO);
                return nb;
            });
        b.setUsedDays(nz(b.getUsedDays()).add(nz(r.getDays())));
        balances.save(b);
    }

    @Transactional(readOnly = true)
    public List<LeaveBalanceDto> balances(Long employeeId) {
        Map<Long, String> typeNames = types.findAll().stream()
            .collect(Collectors.toMap(LeaveType::getId, LeaveType::getName));
        return balances.findByEmployeeId(employeeId).stream().map(b -> {
            BigDecimal remaining = nz(b.getEntitledDays()).subtract(nz(b.getUsedDays()));
            return new LeaveBalanceDto(b.getLeaveTypeId(), typeNames.getOrDefault(b.getLeaveTypeId(), "#" + b.getLeaveTypeId()),
                b.getYear(), b.getEntitledDays(), b.getUsedDays(), remaining);
        }).toList();
    }

    private LeaveRequestDto toDto(LeaveRequest r) {
        String empName = employees.findById(r.getEmployeeId())
            .map(e -> e.getLastName() + " " + e.getFirstName()).orElse("#" + r.getEmployeeId());
        String typeName = types.findById(r.getLeaveTypeId()).map(LeaveType::getName).orElse("#" + r.getLeaveTypeId());
        return new LeaveRequestDto(r.getId(), r.getEmployeeId(), empName, r.getLeaveTypeId(), typeName,
            r.getDateFrom(), r.getDateTo(), r.getDays(), r.getReason(), r.getStatus(), r.getApproverId());
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
