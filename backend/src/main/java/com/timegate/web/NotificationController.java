package com.timegate.web;

import com.timegate.dto.NotificationDtos.*;
import com.timegate.security.CustomUserDetails;
import com.timegate.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "My notifications")
    public List<NotificationDto> list(@AuthenticationPrincipal CustomUserDetails ud) {
        return service.listForUser(ud.getId());
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread notification count")
    public UnreadCount unread(@AuthenticationPrincipal CustomUserDetails ud) {
        return service.unreadCount(ud.getId());
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails ud) {
        service.markRead(id, ud.getId());
        return ResponseEntity.noContent().build();
    }
}
