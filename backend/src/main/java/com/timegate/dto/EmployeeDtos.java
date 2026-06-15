package com.timegate.dto;

import com.timegate.domain.Employee;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public final class EmployeeDtos {
    private EmployeeDtos() {}

    public record EmployeeDto(
        Long id,
        String firstName,
        String lastName,
        String middleName,
        Long departmentId,
        Long positionId,
        String employmentType,
        String payrollModel,
        String qrToken,
        String phone,
        String email,
        LocalDate hireDate,
        String status) {

        public static EmployeeDto from(Employee e) {
            return new EmployeeDto(e.getId(), e.getFirstName(), e.getLastName(), e.getMiddleName(),
                e.getDepartmentId(), e.getPositionId(), e.getEmploymentType(), e.getPayrollModel(),
                e.getQrToken(), e.getPhone(), e.getEmail(), e.getHireDate(), e.getStatus());
        }
    }

    public record EmployeeCreate(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String middleName,
        @NotNull Long departmentId,
        @NotNull Long positionId,
        @NotBlank String employmentType,
        @NotBlank String payrollModel,
        String phone,
        String email,
        @NotNull LocalDate hireDate) {}
}
