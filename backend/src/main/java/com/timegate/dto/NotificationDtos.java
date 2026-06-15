package com.timegate.dto;

import com.timegate.domain.Notification;
import java.time.OffsetDateTime;

public final class NotificationDtos {
    private NotificationDtos() {}

    public record NotificationDto(
        Long id, String channel, String title, String body, Boolean isRead, OffsetDateTime sentAt) {
        public static NotificationDto from(Notification n) {
            return new NotificationDto(n.getId(), n.getChannel(), n.getTitle(), n.getBody(),
                n.getIsRead(), n.getSentAt());
        }
    }

    public record UnreadCount(long unread) {}
}
