package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "payrolls")
public class Payroll {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_id", nullable = false)
    private Long periodId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    private String model;

    @Column(name = "worked_hours")
    private BigDecimal workedHours = BigDecimal.ZERO;

    @Column(name = "worked_shifts")
    private Integer workedShifts = 0;

    @Column(name = "worked_days")
    private Integer workedDays = 0;

    @Column(name = "late_minutes")
    private Integer lateMinutes = 0;

    @Column(name = "overtime_minutes")
    private Integer overtimeMinutes = 0;

    private BigDecimal gross = BigDecimal.ZERO;

    @Column(name = "total_bonus")
    private BigDecimal totalBonus = BigDecimal.ZERO;

    @Column(name = "total_fine")
    private BigDecimal totalFine = BigDecimal.ZERO;

    @Column(name = "total_deduction")
    private BigDecimal totalDeduction = BigDecimal.ZERO;

    private BigDecimal net = BigDecimal.ZERO;

    private String currency = "UZS";

    @Column(nullable = false)
    private String status = "calculated";   // draft | calculated | approved | paid

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @PrePersist @PreUpdate
    void stamp() { generatedAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPeriodId() { return periodId; }
    public void setPeriodId(Long v) { this.periodId = v; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public String getModel() { return model; }
    public void setModel(String v) { this.model = v; }
    public BigDecimal getWorkedHours() { return workedHours; }
    public void setWorkedHours(BigDecimal v) { this.workedHours = v; }
    public Integer getWorkedShifts() { return workedShifts; }
    public void setWorkedShifts(Integer v) { this.workedShifts = v; }
    public Integer getWorkedDays() { return workedDays; }
    public void setWorkedDays(Integer v) { this.workedDays = v; }
    public Integer getLateMinutes() { return lateMinutes; }
    public void setLateMinutes(Integer v) { this.lateMinutes = v; }
    public Integer getOvertimeMinutes() { return overtimeMinutes; }
    public void setOvertimeMinutes(Integer v) { this.overtimeMinutes = v; }
    public BigDecimal getGross() { return gross; }
    public void setGross(BigDecimal v) { this.gross = v; }
    public BigDecimal getTotalBonus() { return totalBonus; }
    public void setTotalBonus(BigDecimal v) { this.totalBonus = v; }
    public BigDecimal getTotalFine() { return totalFine; }
    public void setTotalFine(BigDecimal v) { this.totalFine = v; }
    public BigDecimal getTotalDeduction() { return totalDeduction; }
    public void setTotalDeduction(BigDecimal v) { this.totalDeduction = v; }
    public BigDecimal getNet() { return net; }
    public void setNet(BigDecimal v) { this.net = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public OffsetDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(OffsetDateTime v) { this.generatedAt = v; }
}
