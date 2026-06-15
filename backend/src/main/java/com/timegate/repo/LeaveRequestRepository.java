package com.timegate.repo;

import com.timegate.domain.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    @Query("""
        SELECT r FROM LeaveRequest r
        WHERE (:status IS NULL OR r.status = :status)
          AND (:employeeId IS NULL OR r.employeeId = :employeeId)
        ORDER BY r.id DESC
        """)
    List<LeaveRequest> search(@Param("status") String status,
                              @Param("employeeId") Long employeeId);

    long countByLeaveTypeId(Long leaveTypeId);
}
