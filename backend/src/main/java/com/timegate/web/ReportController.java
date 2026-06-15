package com.timegate.web;

import com.timegate.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reports")
public class ReportController {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String PDF = "application/pdf";

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/attendance")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Attendance report (json | xlsx | pdf)")
    public ResponseEntity<?> attendance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(defaultValue = "json") String format) {

        if ("json".equalsIgnoreCase(format)) {
            return ResponseEntity.ok(service.attendanceData(dateFrom, dateTo, departmentId));
        }
        boolean pdf = "pdf".equalsIgnoreCase(format);
        byte[] body = service.attendanceExport(dateFrom, dateTo, departmentId, pdf);
        String filename = "attendance_" + dateFrom + "_" + dateTo + (pdf ? ".pdf" : ".xlsx");
        return file(body, filename, pdf ? PDF : XLSX);
    }

    @GetMapping("/payroll")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Payroll report (xlsx | pdf)")
    public ResponseEntity<byte[]> payroll(
            @RequestParam Long periodId,
            @RequestParam(defaultValue = "xlsx") String format) {
        boolean pdf = "pdf".equalsIgnoreCase(format);
        byte[] body = service.payrollExport(periodId, pdf);
        String filename = "payroll_period_" + periodId + (pdf ? ".pdf" : ".xlsx");
        return file(body, filename, pdf ? PDF : XLSX);
    }

    private ResponseEntity<byte[]> file(byte[] body, String filename, String contentType) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(body);
    }
}
