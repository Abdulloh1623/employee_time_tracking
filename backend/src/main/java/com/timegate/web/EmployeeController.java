package com.timegate.web;

import com.timegate.common.PageResponse;
import com.timegate.dto.AssignmentDtos.*;
import com.timegate.dto.EmployeeDtos.*;
import com.timegate.service.AssignmentService;
import com.timegate.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employees")
public class EmployeeController {

    private final EmployeeService service;
    private final AssignmentService assignments;

    public EmployeeController(EmployeeService service, AssignmentService assignments) {
        this.service = service;
        this.assignments = assignments;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('employees.read')")
    @Operation(summary = "List employees")
    public PageResponse<EmployeeDto> list(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int perPage) {
        return service.list(departmentId, status, q, sortBy, sortDir, page, perPage);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('employees.read')")
    @Operation(summary = "Get employee")
    public EmployeeDto get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Create employee")
    public ResponseEntity<EmployeeDto> create(@Valid @RequestBody EmployeeCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Update employee")
    public EmployeeDto update(@PathVariable Long id, @Valid @RequestBody EmployeeCreate req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Deactivate employee")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Reactivate an employee")
    public EmployeeDto activate(@PathVariable Long id) {
        return service.activate(id);
    }

    @PostMapping("/{id}/qr/regenerate")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Regenerate the employee QR token")
    public EmployeeDto regenerateQr(@PathVariable Long id) {
        return service.regenerateQr(id);
    }

    // ---- Shift assignment ----
    @GetMapping("/{id}/shifts")
    @PreAuthorize("hasAuthority('employees.read')")
    @Operation(summary = "Employee shift assignments")
    public List<EmployeeShiftDto> shifts(@PathVariable Long id) {
        return assignments.listAssignments(id);
    }

    @PostMapping("/{id}/shifts")
    @PreAuthorize("hasAuthority('shifts.write')")
    @Operation(summary = "Assign a shift to the employee")
    public ResponseEntity<EmployeeShiftDto> assignShift(@PathVariable Long id, @Valid @RequestBody AssignShiftRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignments.assignShift(id, req));
    }

    // ---- Pay rates ----
    @GetMapping("/{id}/pay-rates")
    @PreAuthorize("hasAnyAuthority('payroll.run','employees.read')")
    @Operation(summary = "Employee pay-rate history")
    public List<PayRateDto> payRates(@PathVariable Long id) {
        return assignments.listRates(id);
    }

    @PostMapping("/{id}/pay-rates")
    @PreAuthorize("hasAnyAuthority('payroll.run','employees.write')")
    @Operation(summary = "Set a new pay rate for the employee")
    public ResponseEntity<PayRateDto> setPayRate(@PathVariable Long id, @Valid @RequestBody PayRateCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignments.setPayRate(id, req));
    }

    @PutMapping("/{id}/pay-rates/current")
    @PreAuthorize("hasAnyAuthority('payroll.run','employees.write')")
    @Operation(summary = "Edit the current (open) pay rate in place")
    public PayRateDto updateCurrentRate(@PathVariable Long id, @Valid @RequestBody PayRateUpdate req) {
        return assignments.updateLatestRate(id, req);
    }

    @DeleteMapping("/{id}/pay-rates/current")
    @PreAuthorize("hasAnyAuthority('payroll.run','employees.write')")
    @Operation(summary = "Delete the current (open) rate and reopen the previous one (undo raise)")
    public ResponseEntity<Void> deleteCurrentRate(@PathVariable Long id) {
        assignments.deleteLatestRate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pay-rates/raise/preview")
    @PreAuthorize("hasAnyAuthority('payroll.run','employees.read')")
    @Operation(summary = "Preview a salary raise without persisting")
    public RaisePreview previewRaise(@PathVariable Long id, @Valid @RequestBody RaiseRequest req) {
        return assignments.previewRaise(id, req);
    }

    @PostMapping("/{id}/pay-rates/raise")
    @PreAuthorize("hasAnyAuthority('payroll.run','employees.write')")
    @Operation(summary = "Apply a salary raise (creates a new effective pay rate)")
    public ResponseEntity<PayRateDto> applyRaise(@PathVariable Long id, @Valid @RequestBody RaiseRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignments.applyRaise(id, req));
    }
}
