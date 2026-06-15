package com.timegate.dto;

import java.math.BigDecimal;

public final class ReportDtos {
    private ReportDtos() {}

    public record AttendanceReportRow(
        Long employeeId, String employeeName, String department,
        int presentDays, int lateDays, int totalLateMinutes,
        BigDecimal totalWorkedHours, BigDecimal totalOvertimeHours) {}
}
