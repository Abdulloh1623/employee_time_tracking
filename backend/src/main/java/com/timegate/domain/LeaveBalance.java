package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "leave_balances")
public class LeaveBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private Long leaveTypeId;

    private Short year;

    @Column(name = "entitled_days")
    private BigDecimal entitledDays = BigDecimal.ZERO;

    @Column(name = "used_days")
    private BigDecimal usedDays = BigDecimal.ZERO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public Long getLeaveTypeId() { return leaveTypeId; }
    public void setLeaveTypeId(Long v) { this.leaveTypeId = v; }
    public Short getYear() { return year; }
    public void setYear(Short v) { this.year = v; }
    public BigDecimal getEntitledDays() { return entitledDays; }
    public void setEntitledDays(BigDecimal v) { this.entitledDays = v; }
    public BigDecimal getUsedDays() { return usedDays; }
    public void setUsedDays(BigDecimal v) { this.usedDays = v; }
}
