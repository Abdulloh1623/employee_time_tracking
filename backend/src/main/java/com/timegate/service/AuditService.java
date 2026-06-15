package com.timegate.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timegate.common.PageResponse;
import com.timegate.domain.AppUser;
import com.timegate.domain.AuditLog;
import com.timegate.dto.AuditDtos.AuditLogDto;
import com.timegate.repo.AppUserRepository;
import com.timegate.repo.AuditLogRepository;
import com.timegate.security.CustomUserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AuditService {

    private final AuditLogRepository repo;
    private final AppUserRepository users;
    private final ObjectMapper mapper;

    public AuditService(AuditLogRepository repo, AppUserRepository users, ObjectMapper mapper) {
        this.repo = repo;
        this.users = users;
        this.mapper = mapper;
    }

    /** Record an action performed by the current authenticated user. */
    @Transactional
    public void record(String action, String entityType, Long entityId, Map<String, ?> data) {
        recordForUser(currentUserId(), action, entityType, entityId, data);
    }

    /** Record an action for a specific user (used for login where the context is not yet set). */
    @Transactional
    public void recordForUser(Long userId, String action, String entityType, Long entityId, Map<String, ?> data) {
        try {
            AuditLog log = new AuditLog();
            log.setUserId(userId);
            log.setAction(action);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setNewValue(data == null ? null : mapper.writeValueAsString(data));
            log.setIpAddress(clientIp());
            repo.save(log);
        } catch (Exception ignored) {
            // auditing must never break the main flow
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> list(String action, Long userId, int page, int perPage) {
        Page<AuditLog> result = repo.search(
            (action == null || action.isBlank()) ? null : action, userId,
            PageRequest.of(Math.max(0, page - 1), perPage));
        Map<Long, String> logins = users.findAll().stream()
            .collect(Collectors.toMap(AppUser::getId, AppUser::getLogin));
        return PageResponse.from(result, a -> AuditLogDto.from(a,
            a.getUserId() == null ? "system" : logins.getOrDefault(a.getUserId(), "#" + a.getUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) return ud.getId();
        return null;
    }

    private String clientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                String fwd = attrs.getRequest().getHeader("X-Forwarded-For");
                return (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim()
                    : attrs.getRequest().getRemoteAddr();
            }
        } catch (Exception ignored) { }
        return null;
    }
}
