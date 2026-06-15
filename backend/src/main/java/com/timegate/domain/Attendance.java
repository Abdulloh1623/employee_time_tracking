package com.timegate.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance")
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "shift_id")
    private Long shiftId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "check_in_at")
    private OffsetDateTime checkInAt;

    @Column(name = "check_out_at")
    private OffsetDateTime checkOutAt;

    @Column(name = "worked_minutes")
    private Integer workedMinutes = 0;

    @Column(name = "late_minutes")
    private Integer lateMinutes = 0;

    @Column(name = "early_leave_minutes")
    private Integer earlyLeaveMinutes = 0;

    @Column(name = "overtime_minutes")
    private Integer overtimeMinutes = 0;

    @Column(nullable = false)
    private String status = "present";

    @Column(name = "corrected_by")
    private Long correctedBy;

    private String note;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public Long getShiftId() { return shiftId; }
    public void setShiftId(Long v) { this.shiftId = v; }
    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate v) { this.workDate = v; }
    public OffsetDateTime getCheckInAt() { return checkInAt; }
    public void setCheckInAt(OffsetDateTime v) { this.checkInAt = v; }
    public OffsetDateTime getCheckOutAt() { return checkOutAt; }
    public void setCheckOutAt(OffsetDateTime v) { this.checkOutAt = v; }
    public Integer getWorkedMinutes() { return workedMinutes; }
    public void setWorkedMinutes(Integer v) { this.workedMinutes = v; }
    public Integer getLateMinutes() { return lateMinutes; }
    public void setLateMinutes(Integer v) { this.lateMinutes = v; }
    public Integer getEarlyLeaveMinutes() { return earlyLeaveMinutes; }
    public void setEarlyLeaveMinutes(Integer v) { this.earlyLeaveMinutes = v; }
    public Integer getOvertimeMinutes() { return overtimeMinutes; }
    public void setOvertimeMinutes(Integer v) { this.overtimeMinutes = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public Long getCorrectedBy() { return correctedBy; }
    public void setCorrectedBy(Long v) { this.correctedBy = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
}
