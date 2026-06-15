package com.timegate.web;

import com.timegate.common.PageResponse;
import com.timegate.dto.AuditDtos.AuditLogDto;
import com.timegate.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/audit-logs")
@Tag(name = "Audit")
public class AuditController {

    private final AuditService service;

    public AuditController(AuditService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('admin.config')")
    @Operation(summary = "List audit logs")
    public PageResponse<AuditLogDto> list(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int perPage) {
        return service.list(action, userId, page, perPage);
    }
}
