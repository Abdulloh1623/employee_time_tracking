package com.timegate.repo;

import com.timegate.domain.PayrollPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, Long> {
    List<PayrollPeriod> findAllByOrderByStartDateDesc();

    /** Periods whose date range overlaps [from, to]. */
    @Query("""
        SELECT p FROM PayrollPeriod p
        WHERE p.startDate <= :to AND p.endDate >= :from
        """)
    List<PayrollPeriod> findOverlapping(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
