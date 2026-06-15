package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pay_rates")
public class PayRate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    private String model;

    @Column(name = "hourly_rate")
    private BigDecimal hourlyRate;

    @Column(name = "monthly_salary")
    private BigDecimal monthlySalary;

    @Column(name = "shift_rate")
    private BigDecimal shiftRate;

    private String currency = "UZS";

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public String getModel() { return model; }
    public void setModel(String v) { this.model = v; }
    public BigDecimal getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(BigDecimal v) { this.hourlyRate = v; }
    public BigDecimal getMonthlySalary() { return monthlySalary; }
    public void setMonthlySalary(BigDecimal v) { this.monthlySalary = v; }
    public BigDecimal getShiftRate() { return shiftRate; }
    public void setShiftRate(BigDecimal v) { this.shiftRate = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public LocalDate getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDate v) { this.validFrom = v; }
    public LocalDate getValidTo() { return validTo; }
    public void setValidTo(LocalDate v) { this.validTo = v; }
}
