package com.timegate.domain;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "shifts")
public class Shift {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "break_minutes")
    private Integer breakMinutes = 0;

    @Column(name = "grace_in_minutes")
    private Integer graceInMinutes = 0;

    @Column(name = "grace_out_minutes")
    private Integer graceOutMinutes = 0;

    @Column(name = "overtime_after_min")
    private Integer overtimeAfterMin;

    @Column(name = "is_overnight")
    private Boolean isOvernight = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime v) { this.startTime = v; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime v) { this.endTime = v; }
    public Integer getBreakMinutes() { return breakMinutes; }
    public void setBreakMinutes(Integer v) { this.breakMinutes = v; }
    public Integer getGraceInMinutes() { return graceInMinutes; }
    public void setGraceInMinutes(Integer v) { this.graceInMinutes = v; }
    public Integer getGraceOutMinutes() { return graceOutMinutes; }
    public void setGraceOutMinutes(Integer v) { this.graceOutMinutes = v; }
    public Integer getOvertimeAfterMin() { return overtimeAfterMin; }
    public void setOvertimeAfterMin(Integer v) { this.overtimeAfterMin = v; }
    public Boolean getIsOvernight() { return isOvernight; }
    public void setIsOvernight(Boolean v) { this.isOvernight = v; }
}
