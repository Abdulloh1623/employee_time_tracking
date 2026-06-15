package com.timegate.web;

import com.timegate.dto.OrgDtos.*;
import com.timegate.service.OrgService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Organization")
public class OrgController {

    private final OrgService service;

    public OrgController(OrgService service) {
        this.service = service;
    }

    // Departments
    @GetMapping("/departments")
    @Operation(summary = "List departments")
    public List<DepartmentDto> departments() {
        return service.listDepartments();
    }

    @PostMapping("/departments")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Create department")
    public ResponseEntity<DepartmentDto> createDepartment(@Valid @RequestBody DepartmentCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createDepartment(req));
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Update department")
    public DepartmentDto updateDepartment(@PathVariable Long id, @Valid @RequestBody DepartmentCreate req) {
        return service.updateDepartment(id, req);
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Delete department (must have no employees)")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        service.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    // Positions
    @GetMapping("/positions")
    @Operation(summary = "List positions")
    public List<PositionDto> positions() {
        return service.listPositions();
    }

    @PostMapping("/positions")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Create position")
    public ResponseEntity<PositionDto> createPosition(@Valid @RequestBody PositionCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPosition(req));
    }

    @PutMapping("/positions/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Update position")
    public PositionDto updatePosition(@PathVariable Long id, @Valid @RequestBody PositionCreate req) {
        return service.updatePosition(id, req);
    }

    @DeleteMapping("/positions/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Delete position (must have no employees)")
    public ResponseEntity<Void> deletePosition(@PathVariable Long id) {
        service.deletePosition(id);
        return ResponseEntity.noContent().build();
    }

    // Holidays / work calendar
    @GetMapping("/holidays")
    @Operation(summary = "List holidays / calendar overrides")
    public List<HolidayDto> holidays(@RequestParam(required = false) Integer year) {
        return service.listHolidays(year);
    }

    @PostMapping("/holidays")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Add a holiday / calendar override")
    public ResponseEntity<HolidayDto> createHoliday(@Valid @RequestBody HolidayCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createHoliday(req));
    }

    @PutMapping("/holidays/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Update a calendar entry")
    public HolidayDto updateHoliday(@PathVariable Long id, @Valid @RequestBody HolidayCreate req) {
        return service.updateHoliday(id, req);
    }

    @DeleteMapping("/holidays/{id}")
    @PreAuthorize("hasAuthority('employees.write')")
    @Operation(summary = "Delete a calendar entry")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id) {
        service.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }

    // Shifts
    @GetMapping("/shifts")
    @Operation(summary = "List shifts")
    public List<ShiftDto> shifts() {
        return service.listShifts();
    }

    @PostMapping("/shifts")
    @PreAuthorize("hasAuthority('shifts.write')")
    @Operation(summary = "Create shift")
    public ResponseEntity<ShiftDto> createShift(@Valid @RequestBody ShiftCreate req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createShift(req));
    }
}
