package com.timegate.repo;

import com.timegate.domain.EmployeeShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface EmployeeShiftRepository extends JpaRepository<EmployeeShift, Long> {

    List<EmployeeShift> findByEmployeeIdOrderByValidFromDesc(Long employeeId);

    @Query("""
        SELECT es FROM EmployeeShift es
        WHERE es.employeeId = :employeeId
          AND es.validFrom <= :date
          AND (es.validTo IS NULL OR es.validTo >= :date)
        ORDER BY es.validFrom DESC
        """)
    List<EmployeeShift> findActive(@Param("employeeId") Long employeeId, @Param("date") LocalDate date);
}
