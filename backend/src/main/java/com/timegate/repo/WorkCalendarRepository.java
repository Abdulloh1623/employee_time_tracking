package com.timegate.repo;

import com.timegate.domain.WorkCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WorkCalendarRepository extends JpaRepository<WorkCalendar, Long> {
    Optional<WorkCalendar> findByCalendarDate(LocalDate calendarDate);
    List<WorkCalendar> findByCalendarDateBetweenOrderByCalendarDate(LocalDate from, LocalDate to);
    boolean existsByCalendarDateAndDayType(LocalDate calendarDate, String dayType);
    List<WorkCalendar> findAllByOrderByCalendarDate();
}
