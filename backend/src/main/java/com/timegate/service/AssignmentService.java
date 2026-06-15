package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.EmployeeShift;
import com.timegate.domain.PayRate;
import com.timegate.dto.AssignmentDtos.*;
import com.timegate.repo.EmployeeRepository;
import com.timegate.repo.EmployeeShiftRepository;
import com.timegate.repo.PayRateRepository;
import com.timegate.repo.ShiftRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AssignmentService {

    private static final int SCALE = 2;

    private final EmployeeShiftRepository employeeShifts;
    private final PayRateRepository payRates;
    private final ShiftRepository shifts;
    private final EmployeeRepository employees;
    private final AuditService audit;

    public AssignmentService(EmployeeShiftRepository employeeShifts, PayRateRepository payRates,
                             ShiftRepository shifts, EmployeeRepository employees, AuditService audit) {
        this.employeeShifts = employeeShifts;
        this.payRates = payRates;
        this.shifts = shifts;
        this.employees = employees;
        this.audit = audit;
    }

    // ---------------- Shift assignment ----------------
    @Transactional
    public EmployeeShiftDto assignShift(Long employeeId, AssignShiftRequest req) {
        ensureEmployee(employeeId);
        shifts.findById(req.shiftId())
            .orElseThrow(() -> ApiException.notFound("Shift not found: " + req.shiftId()));

        // close still-open previous assignments
        for (EmployeeShift prev : employeeShifts.findByEmployeeIdOrderByValidFromDesc(employeeId)) {
            if (prev.getValidTo() == null && prev.getValidFrom().isBefore(req.validFrom())) {
                prev.setValidTo(req.validFrom().minusDays(1));
                employeeShifts.save(prev);
            }
        }
        EmployeeShift es = new EmployeeShift();
        es.setEmployeeId(employeeId);
        es.setShiftId(req.shiftId());
        es.setValidFrom(req.validFrom());
        es.setValidTo(req.validTo());
        es = employeeShifts.save(es);
        return EmployeeShiftDto.from(es, shiftName(es.getShiftId()));
    }

    @Transactional(readOnly = true)
    public List<EmployeeShiftDto> listAssignments(Long employeeId) {
        Map<Long, String> names = shiftNames();
        return employeeShifts.findByEmployeeIdOrderByValidFromDesc(employeeId).stream()
            .map(es -> EmployeeShiftDto.from(es, names.getOrDefault(es.getShiftId(), "#" + es.getShiftId())))
            .toList();
    }

    // ---------------- Pay rates ----------------
    @Transactional
    public PayRateDto setPayRate(Long employeeId, PayRateCreate req) {
        ensureEmployee(employeeId);
        PayRate r = applyRate(employeeId, req.validFrom(), req.model(),
            req.hourlyRate(), req.monthlySalary(), req.shiftRate(), req.currency());
        audit.record("PAYRATE_SET", "pay_rate", r.getId(),
            Map.of("employeeId", employeeId, "model", nzs(r.getModel()), "validFrom", r.getValidFrom().toString()));
        return PayRateDto.from(r);
    }

    @Transactional(readOnly = true)
    public List<PayRateDto> listRates(Long employeeId) {
        return payRates.findByEmployeeIdOrderByValidFromDesc(employeeId).stream()
            .map(PayRateDto::from).toList();
    }

    /** Edit the current (open) rate in place — leaves the validFrom/validTo window untouched. */
    @Transactional
    public PayRateDto updateLatestRate(Long employeeId, PayRateUpdate req) {
        ensureEmployee(employeeId);
        PayRate latest = payRates.findTopByEmployeeIdOrderByValidFromDesc(employeeId)
            .orElseThrow(() -> ApiException.notFound("Stavka topilmadi."));
        if (latest.getValidTo() != null)
            throw ApiException.conflict("rate_closed", "Faqat joriy (ochiq) stavkani tahrirlash mumkin.");
        latest.setModel(req.model());
        latest.setHourlyRate(req.hourlyRate());
        latest.setMonthlySalary(req.monthlySalary());
        latest.setShiftRate(req.shiftRate());
        if (req.currency() != null) latest.setCurrency(req.currency());
        PayRate saved = payRates.save(latest);
        audit.record("PAYRATE_UPDATE", "pay_rate", saved.getId(), Map.of("employeeId", employeeId));
        return PayRateDto.from(saved);
    }

    /** Undo the last raise: delete the current (open) rate and re-open the previous one. */
    @Transactional
    public void deleteLatestRate(Long employeeId) {
        ensureEmployee(employeeId);
        List<PayRate> history = payRates.findByEmployeeIdOrderByValidFromDesc(employeeId);
        if (history.isEmpty()) throw ApiException.notFound("Stavka topilmadi.");
        PayRate latest = history.get(0);
        if (latest.getValidTo() != null)
            throw ApiException.conflict("rate_closed", "Faqat joriy (ochiq) stavkani o'chirish mumkin.");
        payRates.delete(latest);
        boolean reopened = history.size() >= 2;
        if (reopened) {
            PayRate prev = history.get(1);
            prev.setValidTo(null);                 // previous rate becomes the current (open) one again
            payRates.save(prev);
        }
        audit.record("PAYRATE_DELETE", "pay_rate", latest.getId(),
            Map.of("employeeId", employeeId, "reopenedPrev", reopened));
    }

    @Transactional(readOnly = true)
    public RaisePreview previewRaise(Long employeeId, RaiseRequest req) {
        ensureEmployee(employeeId);
        PayRate latest = currentRateOrThrow(employeeId);
        String field = raiseField(latest.getModel());
        BigDecimal current = scale(fieldValue(latest, field));
        BigDecimal next = computeNewValue(req.method(), current, req.value());
        return new RaisePreview(latest.getModel(), field, current, next,
            latest.getCurrency(), req.effectiveFrom());
    }

    @Transactional
    public PayRateDto applyRaise(Long employeeId, RaiseRequest req) {
        ensureEmployee(employeeId);
        PayRate latest = currentRateOrThrow(employeeId);
        String field = raiseField(latest.getModel());
        BigDecimal current = scale(fieldValue(latest, field));
        BigDecimal next = computeNewValue(req.method(), current, req.value());

        BigDecimal hourly = latest.getHourlyRate();
        BigDecimal monthly = latest.getMonthlySalary();
        BigDecimal shift = latest.getShiftRate();
        switch (field) {
            case "hourlyRate" -> hourly = next;
            case "monthlySalary" -> monthly = next;
            case "shiftRate" -> shift = next;
            default -> { }
        }
        PayRate r = applyRate(employeeId, req.effectiveFrom(), latest.getModel(),
            hourly, monthly, shift, latest.getCurrency());
        audit.record("PAYRATE_RAISE", "pay_rate", r.getId(), Map.of(
            "employeeId", employeeId, "method", req.method(), "value", req.value().toPlainString(),
            "from", current.toPlainString(), "to", next.toPlainString(),
            "effectiveFrom", req.effectiveFrom().toString()));
        return PayRateDto.from(r);
    }

    /** Core rate-windowing. Keeps a single open rate at the tail with non-overlapping windows. */
    private PayRate applyRate(Long employeeId, LocalDate newValidFrom, String model,
                              BigDecimal hourly, BigDecimal monthly, BigDecimal shift, String currency) {
        // CASE A: same validFrom already exists -> update in place (no duplicate)
        PayRate same = payRates.findByEmployeeIdAndValidFrom(employeeId, newValidFrom).orElse(null);
        if (same != null) {
            same.setModel(model);
            same.setHourlyRate(hourly);
            same.setMonthlySalary(monthly);
            same.setShiftRate(shift);
            same.setCurrency(currency == null ? "UZS" : currency);
            return payRates.save(same);
        }

        PayRate latest = payRates.findTopByEmployeeIdOrderByValidFromDesc(employeeId).orElse(null);
        // CASE C: backdating before the latest window -> reject (protect history / closed-paid periods)
        if (latest != null && newValidFrom.isBefore(latest.getValidFrom()))
            throw ApiException.conflict("rate_backdating",
                "Yangi stavka oxirgi stavkadan oldingi sanaga qo'yilmaydi. "
              + "Oldingi stavkani tahrirlang yoki kelajak sanani tanlang.");
        // CASE D: strictly after latest -> close the currently-open rate
        if (latest != null && latest.getValidTo() == null)
            payRates.save(closeRate(latest, newValidFrom.minusDays(1)));

        // CASE B/D: insert a new open rate
        PayRate r = new PayRate();
        r.setEmployeeId(employeeId);
        r.setModel(model);
        r.setHourlyRate(hourly);
        r.setMonthlySalary(monthly);
        r.setShiftRate(shift);
        r.setCurrency(currency == null ? "UZS" : currency);
        r.setValidFrom(newValidFrom);
        return payRates.save(r);
    }

    private static PayRate closeRate(PayRate r, LocalDate validTo) {
        r.setValidTo(validTo);
        return r;
    }

    private PayRate currentRateOrThrow(Long employeeId) {
        return payRates.findTopByEmployeeIdOrderByValidFromDesc(employeeId)
            .orElseThrow(() -> ApiException.badRequest("Avval stavka belgilang."));
    }

    /** The money field a raise applies to, by model. */
    private static String raiseField(String model) {
        return switch (nzs(model)) {
            case "hourly" -> "hourlyRate";
            case "per_shift" -> "shiftRate";
            case "fixed_monthly", "mixed" -> "monthlySalary";
            default -> "monthlySalary";
        };
    }

    private static BigDecimal fieldValue(PayRate r, String field) {
        return switch (field) {
            case "hourlyRate" -> r.getHourlyRate();
            case "shiftRate" -> r.getShiftRate();
            default -> r.getMonthlySalary();
        };
    }

    private static BigDecimal computeNewValue(String method, BigDecimal current, BigDecimal value) {
        BigDecimal result = switch (method == null ? "" : method) {
            case "percent" -> current.multiply(
                BigDecimal.ONE.add(value.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)));
            case "amount" -> current.add(value);
            case "set" -> value;
            default -> throw ApiException.badRequest("Noma'lum usul: " + method);
        };
        return scale(result);
    }

    // ---------------- helpers ----------------
    private void ensureEmployee(Long id) {
        if (!employees.existsById(id)) throw ApiException.notFound("Employee not found: " + id);
    }
    private static String nzs(String v) { return v == null ? "" : v; }
    private static BigDecimal scale(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(SCALE, RoundingMode.HALF_UP);
    }
    private String shiftName(Long id) {
        return shifts.findById(id).map(s -> s.getName()).orElse("#" + id);
    }
    private Map<Long, String> shiftNames() {
        return shifts.findAll().stream().collect(Collectors.toMap(s -> s.getId(), s -> s.getName()));
    }
}
