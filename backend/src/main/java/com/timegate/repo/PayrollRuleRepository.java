package com.timegate.repo;

import com.timegate.domain.PayrollRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PayrollRuleRepository extends JpaRepository<PayrollRule, Long> {
    List<PayrollRule> findByIsActiveTrue();
}
