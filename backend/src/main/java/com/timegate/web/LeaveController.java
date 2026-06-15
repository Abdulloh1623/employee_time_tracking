package com.timegate.web;

import com.timegate.dto.LeaveDtos.*;
import com.timegate.security.CustomUserDetails;
import com.timegate.service.LeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Leave")
public class LeaveController {

    private final LeaveService service;

    public LeaveController(LeaveService service) {
        this.service = service;
    }

    @GetMapping("/leave-types")
    @Operation(summary = "List leave types")
    public List<LeaveTypeDto> types() {
        return service.listTypes();
    }

    @PostMapping("/leave-types")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Create a leave type")
    public ResponseEntity<LeaveTypeDto> createType(@Valid @RequestBody LeaveTypeCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createType(req));
    }

    @PutMapping("/leave-types/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Update a leave type")
    public LeaveTypeDto updateType(@PathVariable Long id, @Valid @RequestBody LeaveTypeCreate req) {
        return service.updateType(id, req);
    }

    @DeleteMapping("/leave-types/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Delete a leave type (must be unused)")
    public ResponseEntity<Void> deleteType(@PathVariable Long id) {
        service.deleteType(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/leave-requests")
    @Operation(summary = "List leave requests")
    public List<LeaveRequestDto> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long employeeId) {
        return service.list(status, employeeId);
    }

    @PostMapping("/leave-requests")
    @Operation(summary = "Submit a leave request")
    public ResponseEntity<LeaveRequestDto> create(@Valid @RequestBody LeaveRequestCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/leave-requests/{id}/decision")
    @Operation(summary = "Approve or reject a leave request")
    public LeaveRequestDto decide(@PathVariable Long id,
                                  @Valid @RequestBody LeaveDecision decision,
                                  @AuthenticationPrincipal CustomUserDetails ud) {
        return service.decide(id, decision, ud.getId());
    }

    @GetMapping("/employees/{id}/leave-balances")
    @PreAuthorize("hasAuthority('employees.read')")
    @Operation(summary = "Employee leave balances")
    public List<LeaveBalanceDto> balances(@PathVariable Long id) {
        return service.balances(id);
    }
}
