package com.timegate.repo;

import com.timegate.domain.PayRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PayRateRepository extends JpaRepository<PayRate, Long> {
    // Latest effective rate for an employee
    Optional<PayRate> findTopByEmployeeIdOrderByValidFromDesc(Long employeeId);

    List<PayRate> findByEmployeeIdOrderByValidFromDesc(Long employeeId);

    /** Exact-window lookup, used to update a rate in place instead of creating a duplicate. */
    Optional<PayRate> findByEmployeeIdAndValidFrom(Long employeeId, LocalDate validFrom);

    /** The rate effective during a payroll period [from, to]: started on/before the period end
     *  and not ended before the period start. The most recent matching rate wins; the secondary
     *  {@code id DESC} tiebreak makes the result deterministic if two rates share a validFrom. */
    @Query("""
        SELECT r FROM PayRate r
        WHERE r.employeeId = :employeeId
          AND r.validFrom <= :to
          AND (r.validTo IS NULL OR r.validTo >= :from)
        ORDER BY r.validFrom DESC, r.id DESC
        """)
    List<PayRate> findEffective(@Param("employeeId") Long employeeId,
                                @Param("from") LocalDate from,
                                @Param("to") LocalDate to);
}
