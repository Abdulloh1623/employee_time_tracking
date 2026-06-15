package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.Notification;
import com.timegate.dto.NotificationDtos.*;
import com.timegate.repo.AppUserRepository;
import com.timegate.repo.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final AppUserRepository users;

    public NotificationService(NotificationRepository notifications, AppUserRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    /** Create an in-app notification for a user. External channels (SMS/Telegram) are pluggable here. */
    @Transactional
    public void notifyUser(Long userId, String title, String body) {
        if (userId == null) return;
        Notification n = new Notification();
        n.setUserId(userId);
        n.setChannel("push");
        n.setTitle(title);
        n.setBody(body);
        n.setIsRead(false);
        notifications.save(n);
        // TODO: dispatch to email/SMS/Telegram providers based on user preferences.
    }

    /** Resolve the user account linked to an employee and notify them. */
    @Transactional
    public void notifyEmployee(Long employeeId, String title, String body) {
        if (employeeId == null) return;
        users.findFirstByEmployeeId(employeeId).ifPresent(u -> notifyUser(u.getId(), title, body));
    }

    /** Notify every super_admin (e.g. a new leave request needs attention). */
    @Transactional
    public void notifyAdmins(String title, String body) {
        users.findByRole_Name("super_admin").forEach(u -> notifyUser(u.getId(), title, body));
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> listForUser(Long userId) {
        return notifications.findTop50ByUserIdOrderBySentAtDesc(userId).stream()
            .map(NotificationDto::from).toList();
    }

    @Transactional(readOnly = true)
    public UnreadCount unreadCount(Long userId) {
        return new UnreadCount(notifications.countByUserIdAndIsReadFalse(userId));
    }

    @Transactional
    public void markRead(Long id, Long userId) {
        Notification n = notifications.findById(id)
            .orElseThrow(() -> ApiException.notFound("Notification not found: " + id));
        if (!n.getUserId().equals(userId))
            throw ApiException.notFound("Notification not found: " + id);
        n.setIsRead(true);
        notifications.save(n);
    }
}
