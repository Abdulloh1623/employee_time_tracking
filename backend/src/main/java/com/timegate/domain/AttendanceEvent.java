package com.timegate.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_events")
public class AttendanceEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "attendance_id")
    private Long attendanceId;

    @Column(name = "scanned_at", nullable = false)
    private OffsetDateTime scannedAt;

    @Column(name = "event_type", nullable = false)
    private String eventType;   // in | out | auto_out

    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "geo_lat")
    private BigDecimal geoLat;

    @Column(name = "geo_lng")
    private BigDecimal geoLng;

    @Column(name = "is_valid")
    private Boolean isValid = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long v) { this.employeeId = v; }
    public Long getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Long v) { this.attendanceId = v; }
    public OffsetDateTime getScannedAt() { return scannedAt; }
    public void setScannedAt(OffsetDateTime v) { this.scannedAt = v; }
    public String getEventType() { return eventType; }
    public void setEventType(String v) { this.eventType = v; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String v) { this.deviceId = v; }
    public BigDecimal getGeoLat() { return geoLat; }
    public void setGeoLat(BigDecimal v) { this.geoLat = v; }
    public BigDecimal getGeoLng() { return geoLng; }
    public void setGeoLng(BigDecimal v) { this.geoLng = v; }
    public Boolean getIsValid() { return isValid; }
    public void setIsValid(Boolean v) { this.isValid = v; }
}
