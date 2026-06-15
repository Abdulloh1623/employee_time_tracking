package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "leave_requests")
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private Long leaveTypeId;

    @Column(name = "date_from", nullable = false)
    private LocalDate dateFrom;

    @Column(name = "date_to", nullable = false)
    private LocalDate dateTo;

    private BigDecimal days;

    private String reason;

    @Column(nullable = false)
    private String status = "pending";   // pending | approved | rejected | cancelled

    @Column(name = "approver_id")
    private Long approverId;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public Long getLeaveTypeId() { return leaveTypeId; }
    public void setLeaveTypeId(Long v) { this.leaveTypeId = v; }
    public LocalDate getDateFrom() { return dateFrom; }
    public void setDateFrom(LocalDate v) { this.dateFrom = v; }
    public LocalDate getDateTo() { return dateTo; }
    public void setDateTo(LocalDate v) { this.dateTo = v; }
    public BigDecimal getDays() { return days; }
    public void setDays(BigDecimal v) { this.days = v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public Long getApproverId() { return approverId; }
    public void setApproverId(Long v) { this.approverId = v; }
    public OffsetDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(OffsetDateTime v) { this.decidedAt = v; }
}
