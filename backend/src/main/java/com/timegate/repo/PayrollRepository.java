package com.timegate.repo;

import com.timegate.domain.Payroll;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    List<Payroll> findByPeriodIdOrderByEmployeeId(Long periodId);
    Optional<Payroll> findByPeriodIdAndEmployeeId(Long periodId, Long employeeId);
    List<Payroll> findByEmployeeIdOrderByPeriodIdDesc(Long employeeId);
}
