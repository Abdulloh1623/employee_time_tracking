package com.timegate.dto;

import com.timegate.domain.AuditLog;
import java.time.OffsetDateTime;

public final class AuditDtos {
    private AuditDtos() {}

    public record AuditLogDto(
        Long id, Long userId, String userLogin, String action,
        String entityType, Long entityId, String newValue, String ipAddress, OffsetDateTime createdAt) {

        public static AuditLogDto from(AuditLog a, String userLogin) {
            return new AuditLogDto(a.getId(), a.getUserId(), userLogin, a.getAction(),
                a.getEntityType(), a.getEntityId(), a.getNewValue(), a.getIpAddress(), a.getCreatedAt());
        }
    }
}
