package com.timegate.web;

import com.timegate.dto.AttendanceDtos.*;
import com.timegate.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@Tag(name = "Attendance")
public class AttendanceController {

    private final AttendanceService service;

    public AttendanceController(AttendanceService service) {
        this.service = service;
    }

    @PostMapping("/scan")
    @PreAuthorize("hasAuthority('attendance.scan')")
    @Operation(summary = "QR scan (check-in/out) — requires the 'attendance.scan' authority")
    public ResponseEntity<ScanResult> scan(@Valid @RequestBody ScanRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.scan(req));
    }

    @GetMapping("/roster")
    @PreAuthorize("hasAuthority('attendance.scan')")
    @Operation(summary = "Active-employee roster for the scanner's manual picker")
    public List<RosterEntry> roster() {
        return service.roster();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('attendance.read')")
    @Operation(summary = "List attendance in a date range")
    public List<AttendanceDto> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Long employeeId) {
        return service.list(dateFrom, dateTo, employeeId);
    }
}
