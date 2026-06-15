package com.timegate.repo;

import com.timegate.domain.AttendanceEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceEventRepository extends JpaRepository<AttendanceEvent, Long> {
    AttendanceEvent findTopByEmployeeIdOrderByScannedAtDesc(Long employeeId);
}
