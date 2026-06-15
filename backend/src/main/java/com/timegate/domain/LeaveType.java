package com.timegate.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "leave_types")
public class LeaveType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_paid")
    private Boolean isPaid = true;

    @Column(name = "default_days")
    private Integer defaultDays = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public Boolean getIsPaid() { return isPaid; }
    public void setIsPaid(Boolean v) { this.isPaid = v; }
    public Integer getDefaultDays() { return defaultDays; }
    public void setDefaultDays(Integer v) { this.defaultDays = v; }
}
