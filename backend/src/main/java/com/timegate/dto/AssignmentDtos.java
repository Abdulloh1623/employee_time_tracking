package com.timegate.dto;

import com.timegate.domain.EmployeeShift;
import com.timegate.domain.PayRate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class AssignmentDtos {
    private AssignmentDtos() {}

    public record EmployeeShiftDto(Long id, Long shiftId, String shiftName,
                                   LocalDate validFrom, LocalDate validTo) {
        public static EmployeeShiftDto from(EmployeeShift es, String shiftName) {
            return new EmployeeShiftDto(es.getId(), es.getShiftId(), shiftName, es.getValidFrom(), es.getValidTo());
        }
    }

    public record AssignShiftRequest(
        @NotNull Long shiftId,
        @NotNull LocalDate validFrom,
        LocalDate validTo) {}

    public record PayRateDto(Long id, String model, BigDecimal hourlyRate, BigDecimal monthlySalary,
                             BigDecimal shiftRate, String currency, LocalDate validFrom, LocalDate validTo) {
        public static PayRateDto from(PayRate r) {
            return new PayRateDto(r.getId(), r.getModel(), r.getHourlyRate(), r.getMonthlySalary(),
                r.getShiftRate(), r.getCurrency(), r.getValidFrom(), r.getValidTo());
        }
    }

    public record PayRateCreate(
        @NotNull String model,
        BigDecimal hourlyRate,
        BigDecimal monthlySalary,
        BigDecimal shiftRate,
        String currency,
        @NotNull LocalDate validFrom) {}

    /** Edit the current (open) rate in place — the window (validFrom/validTo) is unchanged. */
    public record PayRateUpdate(
        @NotNull String model,
        BigDecimal hourlyRate,
        BigDecimal monthlySalary,
        BigDecimal shiftRate,
        String currency) {}

    /** Raise the current rate. {@code effectiveFrom} is resolved on the client to one of:
     *  today / start-of-this-month / start-of-next-month / a custom date. */
    public record RaiseRequest(
        @NotBlank String method,        // percent | amount | set
        @NotNull BigDecimal value,      // % for percent, +sum for amount, absolute for set
        @NotNull LocalDate effectiveFrom) {}

    /** Non-persisted preview of a raise: which field changes and current → new value. */
    public record RaisePreview(
        String model, String field,
        BigDecimal currentValue, BigDecimal newValue,
        String currency, LocalDate effectiveFrom) {}
}
