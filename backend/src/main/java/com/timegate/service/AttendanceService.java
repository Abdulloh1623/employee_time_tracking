package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.*;
import com.timegate.dto.AttendanceDtos.*;
import com.timegate.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AttendanceService {

    private final EmployeeRepository employees;
    private final AttendanceRepository attendance;
    private final AttendanceEventRepository events;
    private final ShiftRepository shifts;
    private final EmployeeShiftRepository employeeShifts;

    public AttendanceService(EmployeeRepository employees, AttendanceRepository attendance,
                             AttendanceEventRepository events, ShiftRepository shifts,
                             EmployeeShiftRepository employeeShifts) {
        this.employees = employees;
        this.attendance = attendance;
        this.events = events;
        this.shifts = shifts;
        this.employeeShifts = employeeShifts;
    }

    @Transactional(readOnly = true)
    public List<RosterEntry> roster() {
        return employees.findByStatus("active").stream()
            .map(e -> new RosterEntry(e.getId(), e.getLastName() + " " + e.getFirstName()))
            .toList();
    }

    @Transactional
    public ScanResult scan(ScanRequest req) {
        Employee emp;
        if (req.qrToken() != null && !req.qrToken().isBlank()) {
            emp = employees.findByQrToken(req.qrToken())
                .orElseThrow(() -> ApiException.badRequest("Unknown or invalid QR token."));
        } else if (req.employeeId() != null) {
            emp = employees.findById(req.employeeId())
                .orElseThrow(() -> ApiException.notFound("Employee not found: " + req.employeeId()));
        } else {
            throw ApiException.badRequest("qrToken yoki employeeId kerak.");
        }
        String empName = emp.getLastName() + " " + emp.getFirstName();

        OffsetDateTime when = req.scannedAt() != null ? req.scannedAt() : OffsetDateTime.now();

        // Duplicate protection: ignore scans within 60s of the previous one
        AttendanceEvent last = events.findTopByEmployeeIdOrderByScannedAtDesc(emp.getId());
        if (last != null && Math.abs(Duration.between(last.getScannedAt(), when).getSeconds()) < 60) {
            throw ApiException.conflict("duplicate_scan", "Scan ignored: too close to the previous one.");
        }

        LocalDate workDate = when.toLocalDate();
        Attendance att = attendance.findByEmployeeIdAndWorkDate(emp.getId(), workDate).orElse(null);

        // The employee's assigned shift for this date (falls back to the first shift if none assigned)
        Shift shift = employeeShifts.findActive(emp.getId(), workDate).stream().findFirst()
            .flatMap(es -> shifts.findById(es.getShiftId()))
            .or(() -> shifts.findAll().stream().findFirst())
            .orElse(null);

        String eventType;
        if (att == null || att.getCheckInAt() == null) {
            // ---- CHECK-IN ----
            eventType = "in";
            if (att == null) {
                att = new Attendance();
                att.setEmployeeId(emp.getId());
                att.setWorkDate(workDate);
            }
            if (shift != null) att.setShiftId(shift.getId());
            att.setCheckInAt(when);

            int late = 0;
            String status = "present";
            if (shift != null && shift.getStartTime() != null) {
                OffsetDateTime expected = OffsetDateTime.of(workDate, shift.getStartTime(), when.getOffset());
                long diff = Duration.between(expected, when).toMinutes();
                int grace = shift.getGraceInMinutes() == null ? 0 : shift.getGraceInMinutes();
                if (diff > grace) {
                    late = (int) diff;
                    status = "late";
                }
            }
            att.setLateMinutes(late);
            att.setStatus(status);
            att = attendance.save(att);
            saveEvent(emp.getId(), att.getId(), when, "in", req);
            return new ScanResult(att.getId(), emp.getId(), empName, "in", when, att.getStatus(),
                att.getLateMinutes(), null, null);

        } else if (att.getCheckOutAt() == null) {
            // ---- CHECK-OUT ----
            eventType = "out";
            att.setCheckOutAt(when);
            int breakMin = shift != null && shift.getBreakMinutes() != null ? shift.getBreakMinutes() : 0;
            long worked = Duration.between(att.getCheckInAt(), when).toMinutes() - breakMin;
            if (worked < 0) worked = 0;
            att.setWorkedMinutes((int) worked);

            int overtime = 0;
            if (shift != null && shift.getOvertimeAfterMin() != null && worked > shift.getOvertimeAfterMin()) {
                overtime = (int) (worked - shift.getOvertimeAfterMin());
            }
            att.setOvertimeMinutes(overtime);
            att = attendance.save(att);
            saveEvent(emp.getId(), att.getId(), when, "out", req);
            return new ScanResult(att.getId(), emp.getId(), empName, "out", when, att.getStatus(),
                att.getLateMinutes(), att.getWorkedMinutes(), att.getOvertimeMinutes());

        } else {
            throw ApiException.conflict("already_completed",
                "Attendance for today is already completed (check-in and check-out present).");
        }
    }

    @Transactional(readOnly = true)
    public List<AttendanceDto> list(LocalDate from, LocalDate to, Long employeeId) {
        return attendance.findInRange(from, to, employeeId).stream().map(AttendanceDto::from).toList();
    }

    private void saveEvent(Long empId, Long attId, OffsetDateTime when, String type, ScanRequest req) {
        AttendanceEvent ev = new AttendanceEvent();
        ev.setEmployeeId(empId);
        ev.setAttendanceId(attId);
        ev.setScannedAt(when);
        ev.setEventType(type);
        ev.setDeviceId(req.deviceId());
        if (req.geo() != null) {
            ev.setGeoLat(req.geo().lat());
            ev.setGeoLng(req.geo().lng());
        }
        ev.setIsValid(true);
        events.save(ev);
    }
}
