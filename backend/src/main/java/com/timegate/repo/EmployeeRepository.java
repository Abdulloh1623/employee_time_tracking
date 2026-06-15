package com.timegate.repo;

import com.timegate.domain.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    Optional<Employee> findByQrToken(String qrToken);

    List<Employee> findByStatus(String status);

    long countByDepartmentId(Long departmentId);

    long countByPositionId(Long positionId);
}
