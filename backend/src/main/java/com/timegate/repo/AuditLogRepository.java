package com.timegate.repo;

import com.timegate.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:action IS NULL OR a.action = :action)
          AND (:userId IS NULL OR a.userId = :userId)
        ORDER BY a.id DESC
        """)
    Page<AuditLog> search(@Param("action") String action,
                          @Param("userId") Long userId,
                          Pageable pageable);
}
