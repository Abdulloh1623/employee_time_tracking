package com.timegate.dto;

import com.timegate.domain.Payroll;
import com.timegate.domain.PayrollAdjustment;
import com.timegate.domain.PayrollPeriod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class PayrollDtos {
    private PayrollDtos() {}

    public record PeriodDto(Long id, String name, LocalDate startDate, LocalDate endDate, String status) {
        public static PeriodDto from(PayrollPeriod p) {
            return new PeriodDto(p.getId(), p.getName(), p.getStartDate(), p.getEndDate(), p.getStatus());
        }
    }

    public record PeriodCreate(
        @NotBlank String name,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate) {}

    public record PeriodUpdate(
        @NotBlank String name,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate) {}

    public record PayrollRow(
        Long id, Long periodId, Long employeeId, String employeeName, String model,
        BigDecimal workedHours, Integer workedShifts, Integer workedDays,
        Integer lateMinutes, Integer overtimeMinutes,
        BigDecimal gross, BigDecimal totalBonus, BigDecimal totalFine, BigDecimal totalDeduction,
        BigDecimal net, String currency, String status) {

        public static PayrollRow from(Payroll p, String employeeName) {
            return new PayrollRow(p.getId(), p.getPeriodId(), p.getEmployeeId(), employeeName, p.getModel(),
                p.getWorkedHours(), p.getWorkedShifts(), p.getWorkedDays(),
                p.getLateMinutes(), p.getOvertimeMinutes(),
                p.getGross(), p.getTotalBonus(), p.getTotalFine(),
                p.getTotalDeduction(), p.getNet(), p.getCurrency(), p.getStatus());
        }
    }

    public record AdjustmentDto(Long id, String type, BigDecimal amount, String reason, Long ruleId) {
        public static AdjustmentDto from(PayrollAdjustment a) {
            return new AdjustmentDto(a.getId(), a.getType(), a.getAmount(), a.getReason(), a.getRuleId());
        }
    }

    public record AdjustmentCreate(
        @NotBlank String type,           // bonus | fine | deduction | allowance | advance
        @NotNull @Positive BigDecimal amount,
        @NotBlank String reason) {}

    public record PayslipDto(
        PayrollRow payroll, PeriodDto period, List<AdjustmentDto> adjustments) {}

    public record RunSummary(
        Long periodId, int employees, int unconfigured, BigDecimal totalGross, BigDecimal totalNet,
        String currency, String status) {}

    public record RuleDto(Long id, String name, String type, String trigger,
                          String amountType, BigDecimal amountValue, Boolean isActive) {}

    public record RuleCreate(
        @jakarta.validation.constraints.NotBlank String name,
        @jakarta.validation.constraints.NotBlank String type,        // bonus | fine
        @jakarta.validation.constraints.NotBlank String trigger,     // zero_lateness | per_late_minute | early_leave | absence
        @jakarta.validation.constraints.NotBlank String amountType,  // fixed | percent | per_minute
        @jakarta.validation.constraints.NotNull BigDecimal amountValue,
        Boolean isActive) {}
}
