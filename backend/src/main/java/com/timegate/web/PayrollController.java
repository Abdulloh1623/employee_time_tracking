package com.timegate.web;

import com.timegate.dto.PayrollDtos.*;
import com.timegate.security.CustomUserDetails;
import com.timegate.service.PayrollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Payroll")
public class PayrollController {

    private final PayrollService service;

    public PayrollController(PayrollService service) {
        this.service = service;
    }

    // ---- Periods ----
    @GetMapping("/payroll/periods")
    @PreAuthorize("hasAnyAuthority('payroll.run','reports.read')")
    @Operation(summary = "List payroll periods")
    public List<PeriodDto> listPeriods() {
        return service.listPeriods();
    }

    @PostMapping("/payroll/periods")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Create payroll period")
    public ResponseEntity<PeriodDto> createPeriod(@Valid @RequestBody PeriodCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPeriod(req));
    }

    @PutMapping("/payroll/periods/{id}")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Update an open payroll period")
    public PeriodDto updatePeriod(@PathVariable Long id, @Valid @RequestBody PeriodUpdate req) {
        return service.updatePeriod(id, req);
    }

    @DeleteMapping("/payroll/periods/{id}")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Delete an empty, open period")
    public ResponseEntity<Void> deletePeriod(@PathVariable Long id) {
        service.deletePeriod(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/payroll/periods/{id}/calculate")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Calculate payroll for a period")
    public RunSummary calculate(@PathVariable Long id) {
        return service.calculate(id);
    }

    @PostMapping("/payroll/periods/{id}/close")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Close a payroll period (lock records)")
    public PeriodDto close(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails ud) {
        return service.close(id, ud.getId());
    }

    @PostMapping("/payroll/periods/{id}/reopen")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Reopen a closed/paid period")
    public PeriodDto reopen(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails ud) {
        return service.reopen(id, ud.getId());
    }

    @PostMapping("/payroll/periods/{id}/mark-paid")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Mark a closed period as paid")
    public PeriodDto markPaid(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails ud) {
        return service.markPaid(id, ud.getId());
    }

    // ---- Rules ----
    @GetMapping("/payroll/rules")
    @PreAuthorize("hasAnyAuthority('payroll.run','reports.read')")
    @Operation(summary = "List bonus/fine rules")
    public List<RuleDto> listRules() {
        return service.listRules();
    }

    @PostMapping("/payroll/rules")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Create a payroll rule")
    public ResponseEntity<RuleDto> createRule(@Valid @RequestBody RuleCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createRule(req));
    }

    @PutMapping("/payroll/rules/{id}")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Update a payroll rule")
    public RuleDto updateRule(@PathVariable Long id, @Valid @RequestBody RuleCreate req) {
        return service.updateRule(id, req);
    }

    @DeleteMapping("/payroll/rules/{id}")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Delete a payroll rule")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        service.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Payrolls / payslips ----
    @GetMapping("/payrolls")
    @PreAuthorize("hasAnyAuthority('payroll.run','reports.read')")
    @Operation(summary = "List payrolls in a period")
    public List<PayrollRow> listPayrolls(@RequestParam Long periodId) {
        return service.listPayrolls(periodId);
    }

    @GetMapping("/payrolls/{id}")
    @PreAuthorize("hasAnyAuthority('payroll.run','reports.read')")
    @Operation(summary = "Get payslip")
    public PayslipDto payslip(@PathVariable Long id) {
        return service.getPayslip(id);
    }

    @GetMapping("/payrolls/{id}/payslip.pdf")
    @PreAuthorize("hasAnyAuthority('payroll.run','reports.read')")
    @Operation(summary = "Download an individual payslip as PDF")
    public ResponseEntity<byte[]> payslipPdf(@PathVariable Long id) {
        byte[] body = service.payslipPdf(id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payslip_" + id + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(body);
    }

    @PostMapping("/payrolls/{id}/adjustments")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Add a manual bonus/fine/deduction")
    public ResponseEntity<AdjustmentDto> addAdjustment(
            @PathVariable Long id,
            @Valid @RequestBody AdjustmentCreate req,
            @AuthenticationPrincipal CustomUserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addAdjustment(id, req, ud.getId()));
    }

    @PutMapping("/payrolls/{id}/adjustments/{adjustmentId}")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Update a manual adjustment")
    public AdjustmentDto updateAdjustment(@PathVariable Long id, @PathVariable Long adjustmentId,
                                          @Valid @RequestBody AdjustmentCreate req) {
        return service.updateAdjustment(id, adjustmentId, req);
    }

    @DeleteMapping("/payrolls/{id}/adjustments/{adjustmentId}")
    @PreAuthorize("hasAuthority('payroll.run')")
    @Operation(summary = "Delete a manual adjustment")
    public ResponseEntity<Void> deleteAdjustment(@PathVariable Long id, @PathVariable Long adjustmentId) {
        service.deleteAdjustment(id, adjustmentId);
        return ResponseEntity.noContent().build();
    }
}
