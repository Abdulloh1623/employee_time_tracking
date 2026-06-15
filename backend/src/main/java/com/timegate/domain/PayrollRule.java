package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "payroll_rules")
public class PayrollRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;          // bonus | fine

    @Column(name = "trigger")
    private String trigger;       // zero_lateness | per_late_minute | absence | holiday | night | kpi

    @Column(name = "amount_type")
    private String amountType;    // fixed | percent | per_minute

    @Column(name = "amount_value")
    private BigDecimal amountValue = BigDecimal.ZERO;

    @Column(name = "is_active")
    private Boolean isActive = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getType() { return type; }
    public void setType(String v) { this.type = v; }
    public String getTrigger() { return trigger; }
    public void setTrigger(String v) { this.trigger = v; }
    public String getAmountType() { return amountType; }
    public void setAmountType(String v) { this.amountType = v; }
    public BigDecimal getAmountValue() { return amountValue; }
    public void setAmountValue(BigDecimal v) { this.amountValue = v; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean v) { this.isActive = v; }
}
