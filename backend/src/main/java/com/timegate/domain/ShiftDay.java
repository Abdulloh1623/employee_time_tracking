package com.timegate.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "shift_days")
public class ShiftDay {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    private Short weekday;   // 1 = Monday ... 7 = Sunday

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getShiftId() { return shiftId; }
    public void setShiftId(Long v) { this.shiftId = v; }
    public Short getWeekday() { return weekday; }
    public void setWeekday(Short v) { this.weekday = v; }
}
