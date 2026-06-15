package com.timegate.repo;

import com.timegate.domain.PayrollAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PayrollAdjustmentRepository extends JpaRepository<PayrollAdjustment, Long> {

    List<PayrollAdjustment> findByPayrollId(Long payrollId);

    // Remove auto-generated adjustments (rule-based) for a payroll before recalculation,
    // keeping manual ones (rule_id IS NULL).
    // flush+clear so the bulk DELETE is visible and the persistence-context cache is reset,
    // otherwise a subsequent findByPayrollId can return stale (already-deleted) rows -> double counting.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PayrollAdjustment a WHERE a.payrollId = :payrollId AND a.ruleId IS NOT NULL")
    void deleteAutoByPayrollId(@Param("payrollId") Long payrollId);
}
