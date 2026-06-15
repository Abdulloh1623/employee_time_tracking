package com.timegate.dto;

import com.timegate.domain.LeaveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class LeaveDtos {
    private LeaveDtos() {}

    public record LeaveTypeDto(Long id, String name, Boolean isPaid, Integer defaultDays) {
        public static LeaveTypeDto from(LeaveType t) {
            return new LeaveTypeDto(t.getId(), t.getName(), t.getIsPaid(), t.getDefaultDays());
        }
    }

    public record LeaveTypeCreate(
        @NotBlank String name,
        Boolean isPaid,
        Integer defaultDays) {}

    public record LeaveRequestDto(
        Long id, Long employeeId, String employeeName,
        Long leaveTypeId, String leaveTypeName,
        LocalDate dateFrom, LocalDate dateTo, BigDecimal days,
        String reason, String status, Long approverId) {}

    public record LeaveRequestCreate(
        @NotNull Long employeeId,
        @NotNull Long leaveTypeId,
        @NotNull LocalDate dateFrom,
        @NotNull LocalDate dateTo,
        String reason) {}

    /** Self-service leave request — employeeId is taken from the authenticated user. */
    public record SelfLeaveCreate(
        @NotNull Long leaveTypeId,
        @NotNull LocalDate dateFrom,
        @NotNull LocalDate dateTo,
        String reason) {}

    public record LeaveDecision(
        @NotNull String decision,   // approved | rejected
        String comment) {}

    public record LeaveBalanceDto(
        Long leaveTypeId, String leaveTypeName, Short year,
        BigDecimal entitledDays, BigDecimal usedDays, BigDecimal remainingDays) {}
}
