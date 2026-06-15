package com.timegate.web;

import com.timegate.common.ApiException;
import com.timegate.dto.AttendanceDtos.AttendanceDto;
import com.timegate.dto.EmployeeDtos.EmployeeDto;
import com.timegate.dto.LeaveDtos.LeaveBalanceDto;
import com.timegate.dto.LeaveDtos.LeaveRequestCreate;
import com.timegate.dto.LeaveDtos.LeaveRequestDto;
import com.timegate.dto.LeaveDtos.LeaveTypeDto;
import com.timegate.dto.LeaveDtos.SelfLeaveCreate;
import com.timegate.dto.PayrollDtos.PayslipDto;
import com.timegate.security.CustomUserDetails;
import com.timegate.service.AttendanceService;
import com.timegate.service.EmployeeService;
import com.timegate.service.LeaveService;
import com.timegate.service.PayrollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Self-service endpoints: every route returns ONLY the authenticated user's own data,
 * derived from the user's linked employeeId. Available to any authenticated account
 * (an employee role has no management permissions, so these are how they see their data).
 */
@RestController
@RequestMapping("/api/v1/me")
@Tag(name = "Self-service")
public class MeController {

    private final EmployeeService employees;
    private final AttendanceService attendance;
    private final LeaveService leave;
    private final PayrollService payroll;

    public MeController(EmployeeService employees, AttendanceService attendance,
                        LeaveService leave, PayrollService payroll) {
        this.employees = employees;
        this.attendance = attendance;
        this.leave = leave;
        this.payroll = payroll;
    }

    private Long empId(CustomUserDetails ud) {
        Long id = ud == null ? null : ud.getEmployeeId();
        if (id == null) {
            throw ApiException.badRequest("Bu hisob xodimga bog'lanmagan.");
        }
        return id;
    }

    @GetMapping("/profile")
    @Operation(summary = "The signed-in employee's own profile (incl. QR token)")
    public EmployeeDto profile(@AuthenticationPrincipal CustomUserDetails ud) {
        return employees.get(empId(ud));
    }

    @GetMapping("/attendance")
    @Operation(summary = "The signed-in employee's own attendance in a date range")
    public List<AttendanceDto> myAttendance(
            @AuthenticationPrincipal CustomUserDetails ud,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return attendance.list(dateFrom, dateTo, empId(ud));
    }

    @GetMapping("/payslips")
    @Operation(summary = "The signed-in employee's own payslips across periods")
    public List<PayslipDto> myPayslips(@AuthenticationPrincipal CustomUserDetails ud) {
        return payroll.payslipsForEmployee(empId(ud));
    }

    @GetMapping("/leave-balances")
    @Operation(summary = "The signed-in employee's own leave balances")
    public List<LeaveBalanceDto> myBalances(@AuthenticationPrincipal CustomUserDetails ud) {
        return leave.balances(empId(ud));
    }

    @GetMapping("/leave-requests")
    @Operation(summary = "The signed-in employee's own leave requests")
    public List<LeaveRequestDto> myLeave(@AuthenticationPrincipal CustomUserDetails ud) {
        return leave.list(null, empId(ud));
    }

    @PostMapping("/leave-requests")
    @Operation(summary = "Submit a leave request for the signed-in employee")
    public ResponseEntity<LeaveRequestDto> submitLeave(
            @AuthenticationPrincipal CustomUserDetails ud,
            @Valid @RequestBody SelfLeaveCreate req) {
        LeaveRequestCreate full = new LeaveRequestCreate(
                empId(ud), req.leaveTypeId(), req.dateFrom(), req.dateTo(), req.reason());
        return ResponseEntity.status(HttpStatus.CREATED).body(leave.create(full));
    }

    @GetMapping("/leave-types")
    @Operation(summary = "Leave types available when submitting a self-service request")
    public List<LeaveTypeDto> leaveTypes() {
        return leave.listTypes();
    }
}
