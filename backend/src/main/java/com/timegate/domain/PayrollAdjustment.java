package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "payroll_adjustments")
public class PayrollAdjustment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payroll_id", nullable = false)
    private Long payrollId;

    @Column(name = "rule_id")
    private Long ruleId;          // null = manual adjustment

    @Column(nullable = false)
    private String type;          // bonus | fine | deduction | allowance | advance

    @Column(nullable = false)
    private BigDecimal amount;    // always positive; sign applied by type

    private String reason;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPayrollId() { return payrollId; }
    public void setPayrollId(Long v) { this.payrollId = v; }
    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long v) { this.ruleId = v; }
    public String getType() { return type; }
    public void setType(String v) { this.type = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { this.amount = v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long v) { this.createdBy = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
}
