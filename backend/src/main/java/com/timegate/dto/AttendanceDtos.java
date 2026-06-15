package com.timegate.dto;

import com.timegate.domain.Attendance;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class AttendanceDtos {
    private AttendanceDtos() {}

    public record Geo(BigDecimal lat, BigDecimal lng) {}

    public record ScanRequest(
        String qrToken,          // either qrToken OR employeeId must be provided
        Long employeeId,
        @NotBlank String deviceId,
        OffsetDateTime scannedAt,
        Geo geo) {}

    /** Lightweight roster for the scanner's "pick employee" list (no QR token exposed). */
    public record RosterEntry(Long id, String name) {}

    public record ScanResult(
        Long attendanceId,
        Long employeeId,
        String employeeName,
        String eventType,
        OffsetDateTime recordedAt,
        String status,
        Integer lateMinutes,
        Integer workedMinutes,
        Integer overtimeMinutes) {}

    public record AttendanceDto(
        Long id, Long employeeId, Long shiftId, LocalDate workDate,
        OffsetDateTime checkInAt, OffsetDateTime checkOutAt,
        Integer workedMinutes, Integer lateMinutes, Integer earlyLeaveMinutes,
        Integer overtimeMinutes, String status) {

        public static AttendanceDto from(Attendance a) {
            return new AttendanceDto(a.getId(), a.getEmployeeId(), a.getShiftId(), a.getWorkDate(),
                a.getCheckInAt(), a.getCheckOutAt(), a.getWorkedMinutes(), a.getLateMinutes(),
                a.getEarlyLeaveMinutes(), a.getOvertimeMinutes(), a.getStatus());
        }
    }
}
