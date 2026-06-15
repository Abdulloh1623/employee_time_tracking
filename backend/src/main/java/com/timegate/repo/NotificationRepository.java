package com.timegate.repo;

import com.timegate.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop50ByUserIdOrderBySentAtDesc(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
}
