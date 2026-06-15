package com.timegate.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "work_calendar")
public class WorkCalendar {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "calendar_date", nullable = false, unique = true)
    private LocalDate calendarDate;

    @Column(name = "day_type")
    private String dayType;        // holiday | weekend | workday

    private String description;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getCalendarDate() { return calendarDate; }
    public void setCalendarDate(LocalDate v) { this.calendarDate = v; }
    public String getDayType() { return dayType; }
    public void setDayType(String v) { this.dayType = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
}
