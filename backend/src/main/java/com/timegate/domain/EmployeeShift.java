package com.timegate.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "employee_shifts")
public class EmployeeShift {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public Long getShiftId() { return shiftId; }
    public void setShiftId(Long v) { this.shiftId = v; }
    public LocalDate getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDate v) { this.validFrom = v; }
    public LocalDate getValidTo() { return validTo; }
    public void setValidTo(LocalDate v) { this.validTo = v; }
}
