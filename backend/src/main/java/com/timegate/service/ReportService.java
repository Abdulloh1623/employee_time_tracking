package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.Attendance;
import com.timegate.domain.Department;
import com.timegate.domain.Employee;
import com.timegate.domain.Payroll;
import com.timegate.dto.ReportDtos.AttendanceReportRow;
import com.timegate.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final AttendanceRepository attendance;
    private final EmployeeRepository employees;
    private final DepartmentRepository departments;
    private final PayrollRepository payrolls;
    private final PayrollPeriodRepository periods;

    public ReportService(AttendanceRepository attendance, EmployeeRepository employees,
                         DepartmentRepository departments, PayrollRepository payrolls,
                         PayrollPeriodRepository periods) {
        this.attendance = attendance;
        this.employees = employees;
        this.departments = departments;
        this.payrolls = payrolls;
        this.periods = periods;
    }

    // ---------------- Attendance report ----------------
    @Transactional(readOnly = true)
    public List<AttendanceReportRow> attendanceData(LocalDate from, LocalDate to, Long departmentId) {
        Map<Long, Employee> empMap = employees.findAll().stream()
            .collect(Collectors.toMap(Employee::getId, e -> e));
        Map<Long, String> deptMap = departments.findAll().stream()
            .collect(Collectors.toMap(Department::getId, Department::getName));

        Map<Long, List<Attendance>> byEmp = attendance.findByWorkDateBetween(from, to)
            .stream().collect(Collectors.groupingBy(Attendance::getEmployeeId));

        List<AttendanceReportRow> rows = new ArrayList<>();
        for (var entry : byEmp.entrySet()) {
            Employee e = empMap.get(entry.getKey());
            if (e == null) continue;
            if (departmentId != null && !departmentId.equals(e.getDepartmentId())) continue;

            List<Attendance> list = entry.getValue();
            int present = (int) list.stream().filter(a -> a.getCheckInAt() != null).count();
            int lateDays = (int) list.stream().filter(a -> nz(a.getLateMinutes()) > 0).count();
            int lateMin = list.stream().mapToInt(a -> nz(a.getLateMinutes())).sum();
            int workedMin = list.stream().mapToInt(a -> nz(a.getWorkedMinutes())).sum();
            int otMin = list.stream().mapToInt(a -> nz(a.getOvertimeMinutes())).sum();

            rows.add(new AttendanceReportRow(
                e.getId(), e.getLastName() + " " + e.getFirstName(),
                e.getDepartmentId() == null ? "" : deptMap.getOrDefault(e.getDepartmentId(), ""),
                present, lateDays, lateMin,
                hours(workedMin), hours(otMin)));
        }
        rows.sort(Comparator.comparing(AttendanceReportRow::employeeName));
        return rows;
    }

    @Transactional(readOnly = true)
    public byte[] attendanceExport(LocalDate from, LocalDate to, Long departmentId, boolean pdf) {
        List<AttendanceReportRow> data = attendanceData(from, to, departmentId);
        List<String> headers = List.of("Xodim", "Bo'lim", "Kelgan kun", "Kechikkan kun",
            "Kechikish (daq.)", "Ishlangan soat", "Overtime soat");
        List<List<String>> rows = data.stream().map(r -> List.of(
            r.employeeName(), r.department(), String.valueOf(r.presentDays()),
            String.valueOf(r.lateDays()), String.valueOf(r.totalLateMinutes()),
            r.totalWorkedHours().toPlainString(), r.totalOvertimeHours().toPlainString()
        )).toList();
        String title = "Davomat hisoboti: " + from + " - " + to;
        return pdf ? PdfExporter.export(title, headers, rows) : XlsxExporter.export(title, headers, rows);
    }

    // ---------------- Payroll report ----------------
    @Transactional(readOnly = true)
    public byte[] payrollExport(Long periodId, boolean pdf) {
        var period = periods.findById(periodId)
            .orElseThrow(() -> ApiException.notFound("Period not found: " + periodId));
        Map<Long, String> names = employees.findAll().stream()
            .collect(Collectors.toMap(Employee::getId, e -> e.getLastName() + " " + e.getFirstName()));
        List<Payroll> list = payrolls.findByPeriodIdOrderByEmployeeId(periodId);

        List<String> headers = List.of("Xodim", "Model", "Soat", "Brutto", "Bonus", "Jarima", "Ushlanma", "Netto");
        List<List<String>> rows = list.stream().map(p -> List.of(
            names.getOrDefault(p.getEmployeeId(), "#" + p.getEmployeeId()),
            p.getModel(), str(p.getWorkedHours()),
            str(p.getGross()), str(p.getTotalBonus()), str(p.getTotalFine()),
            str(p.getTotalDeduction()), str(p.getNet())
        )).toList();
        String title = "Ish haqi vedomosti: " + period.getName();
        return pdf ? PdfExporter.export(title, headers, rows) : XlsxExporter.export(title, headers, rows);
    }

    private static BigDecimal hours(int minutes) {
        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }
    private static String str(BigDecimal v) { return v == null ? "0" : v.toPlainString(); }
    private static int nz(Integer v) { return v == null ? 0 : v; }
}
