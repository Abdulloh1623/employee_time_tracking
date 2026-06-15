package com.timegate.repo;

import com.timegate.domain.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);

    List<Attendance> findByWorkDateBetween(LocalDate from, LocalDate to);

    @Query("""
        SELECT a FROM Attendance a
        WHERE a.workDate BETWEEN :from AND :to
          AND (:employeeId IS NULL OR a.employeeId = :employeeId)
        ORDER BY a.workDate DESC, a.employeeId
        """)
    List<Attendance> findInRange(@Param("from") LocalDate from,
                                 @Param("to") LocalDate to,
                                 @Param("employeeId") Long employeeId);
}
