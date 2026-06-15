package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.*;
import com.timegate.dto.PayrollDtos.*;
import com.timegate.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PayrollService {

    private static final int SCALE = 2;
    private static final Set<String> ADJ_TYPES = Set.of("bonus", "fine", "deduction", "allowance", "advance");
    private static final Set<String> RULE_TYPES = Set.of("bonus", "fine", "deduction");
    private static final Set<String> RULE_TRIGGERS = Set.of(
        "zero_lateness", "per_late_minute", "early_leave", "absence", "holiday", "night", "kpi", "income_tax");
    private static final Set<String> AMOUNT_TYPES = Set.of("fixed", "percent", "per_minute");

    private final PayrollPeriodRepository periods;
    private final PayrollRepository payrolls;
    private final PayrollAdjustmentRepository adjustments;
    private final PayrollRuleRepository rules;
    private final PayRateRepository rates;
    private final EmployeeRepository employees;
    private final AttendanceRepository attendance;
    private final ShiftRepository shifts;
    private final WorkCalendarRepository workCalendar;
    private final AuditService audit;

    public PayrollService(PayrollPeriodRepository periods, PayrollRepository payrolls,
                          PayrollAdjustmentRepository adjustments, PayrollRuleRepository rules,
                          PayRateRepository rates, EmployeeRepository employees,
                          AttendanceRepository attendance, ShiftRepository shifts,
                          WorkCalendarRepository workCalendar, AuditService audit) {
        this.periods = periods;
        this.payrolls = payrolls;
        this.adjustments = adjustments;
        this.rules = rules;
        this.rates = rates;
        this.employees = employees;
        this.attendance = attendance;
        this.shifts = shifts;
        this.workCalendar = workCalendar;
        this.audit = audit;
    }

    // ---------------- Periods ----------------
    @Transactional(readOnly = true)
    public List<PeriodDto> listPeriods() {
        return periods.findAllByOrderByStartDateDesc().stream().map(PeriodDto::from).toList();
    }

    @Transactional
    public PeriodDto createPeriod(PeriodCreate req) {
        if (req.endDate().isBefore(req.startDate()))
            throw ApiException.badRequest("Tugash sanasi boshlanishdan oldin bo'lmasligi kerak.");
        if (!periods.findOverlapping(req.startDate(), req.endDate()).isEmpty())
            throw ApiException.conflict("period_overlap", "Bu sanalar mavjud davr bilan kesishadi.");
        PayrollPeriod p = new PayrollPeriod();
        p.setName(req.name());
        p.setStartDate(req.startDate());
        p.setEndDate(req.endDate());
        p.setStatus("open");
        return PeriodDto.from(periods.save(p));
    }

    @Transactional
    public PeriodDto updatePeriod(Long periodId, PeriodUpdate req) {
        PayrollPeriod p = period(periodId);
        if (!"open".equals(p.getStatus()))
            throw ApiException.conflict("period_not_open", "Faqat ochiq davrni tahrirlash mumkin.");
        if (req.endDate().isBefore(req.startDate()))
            throw ApiException.badRequest("Tugash sanasi boshlanishdan oldin bo'lmasligi kerak.");
        boolean overlap = periods.findOverlapping(req.startDate(), req.endDate()).stream()
            .anyMatch(o -> !o.getId().equals(periodId));
        if (overlap)
            throw ApiException.conflict("period_overlap", "Bu sanalar mavjud davr bilan kesishadi.");
        p.setName(req.name());
        p.setStartDate(req.startDate());
        p.setEndDate(req.endDate());
        periods.save(p);
        audit.record("PAYROLL_PERIOD_UPDATE", "payroll_period", periodId,
            Map.of("name", req.name(), "startDate", req.startDate().toString(), "endDate", req.endDate().toString()));
        return PeriodDto.from(p);
    }

    @Transactional
    public void deletePeriod(Long periodId) {
        PayrollPeriod p = period(periodId);
        if (!"open".equals(p.getStatus()))
            throw ApiException.conflict("period_not_open", "Faqat ochiq davrni o'chirish mumkin.");
        if (!payrolls.findByPeriodIdOrderByEmployeeId(periodId).isEmpty())
            throw ApiException.conflict("period_not_empty", "Hisoblangan davrni o'chirib bo'lmaydi.");
        periods.delete(p);
        audit.record("PAYROLL_PERIOD_DELETE", "payroll_period", periodId, Map.of("name", p.getName()));
    }

    @Transactional
    public PeriodDto close(Long periodId, Long userId) {
        PayrollPeriod p = period(periodId);
        if (!"calculated".equals(p.getStatus()) && !"open".equals(p.getStatus()))
            throw ApiException.conflict("bad_status", "Davrni faqat hisoblangandan keyin yopish mumkin.");
        setPeriodAndPayrolls(p, "closed", "approved", userId);
        audit.record("PAYROLL_CLOSE", "payroll_period", periodId, Map.of("name", p.getName()));
        return PeriodDto.from(p);
    }

    @Transactional
    public PeriodDto reopen(Long periodId, Long userId) {
        PayrollPeriod p = period(periodId);
        if ("open".equals(p.getStatus()))
            throw ApiException.conflict("already_open", "Davr allaqachon ochiq.");
        p.setClosedAt(null);
        p.setClosedBy(null);
        setPeriodAndPayrolls(p, "open", "calculated", userId);
        audit.record("PAYROLL_REOPEN", "payroll_period", periodId, Map.of("name", p.getName()));
        return PeriodDto.from(p);
    }

    @Transactional
    public PeriodDto markPaid(Long periodId, Long userId) {
        PayrollPeriod p = period(periodId);
        if (!"closed".equals(p.getStatus()))
            throw ApiException.conflict("must_close_first", "To'lash uchun avval davrni yoping.");
        setPeriodAndPayrolls(p, "paid", "paid", userId);
        audit.record("PAYROLL_PAID", "payroll_period", periodId, Map.of("name", p.getName()));
        return PeriodDto.from(p);
    }

    private void setPeriodAndPayrolls(PayrollPeriod p, String periodStatus, String payrollStatus, Long userId) {
        p.setStatus(periodStatus);
        if ("closed".equals(periodStatus)) {
            p.setClosedAt(OffsetDateTime.now());
            p.setClosedBy(userId);
        }
        periods.save(p);
        for (Payroll pr : payrolls.findByPeriodIdOrderByEmployeeId(p.getId())) {
            pr.setStatus(payrollStatus);
            payrolls.save(pr);
        }
    }

    // ---------------- Calculation engine ----------------
    @Transactional
    public RunSummary calculate(Long periodId) {
        PayrollPeriod p = period(periodId);
        if (!"open".equals(p.getStatus()) && !"calculated".equals(p.getStatus()))
            throw ApiException.conflict("period_locked", "Yopilgan/to'langan davrni qayta hisoblab bo'lmaydi.");

        List<Employee> active = employees.findByStatus("active");
        List<PayrollRule> activeRules = rules.findByIsActiveTrue();

        Map<Long, List<Attendance>> attByEmp = attendance
            .findByWorkDateBetween(p.getStartDate(), p.getEndDate())
            .stream().collect(Collectors.groupingBy(Attendance::getEmployeeId));

        // Calendar + shift context for holiday / night premiums
        Set<LocalDate> holidayDates = workCalendar
            .findByCalendarDateBetweenOrderByCalendarDate(p.getStartDate(), p.getEndDate())
            .stream().filter(c -> "holiday".equals(c.getDayType()))
            .map(WorkCalendar::getCalendarDate).collect(Collectors.toSet());
        Map<Long, Shift> shiftsById = shifts.findAll().stream()
            .collect(Collectors.toMap(Shift::getId, s -> s));

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        int unconfigured = 0;

        for (Employee e : active) {
            List<Attendance> att = attByEmp.getOrDefault(e.getId(), List.of());

            int workedMinutes = att.stream().mapToInt(a -> nz(a.getWorkedMinutes())).sum();
            int lateMinutes = att.stream().mapToInt(a -> nz(a.getLateMinutes())).sum();
            int overtimeMinutes = att.stream().mapToInt(a -> nz(a.getOvertimeMinutes())).sum();
            int earlyLeaveMinutes = att.stream().mapToInt(a -> nz(a.getEarlyLeaveMinutes())).sum();
            int workedDays = (int) att.stream().filter(a -> a.getCheckInAt() != null).count();
            int absentDays = (int) att.stream().filter(a -> "absent".equals(a.getStatus())).count();
            int holidayDays = (int) att.stream()
                .filter(a -> a.getCheckInAt() != null && holidayDates.contains(a.getWorkDate())).count();
            int nightDays = (int) att.stream()
                .filter(a -> a.getCheckInAt() != null && a.getShiftId() != null
                    && shiftsById.get(a.getShiftId()) != null
                    && Boolean.TRUE.equals(shiftsById.get(a.getShiftId()).getIsOvernight())).count();

            BigDecimal workedHours = minutesToHours(workedMinutes);
            BigDecimal overtimeHours = minutesToHours(overtimeMinutes);

            // Rate effective DURING the period (not just the latest)
            PayRate rate = rates.findEffective(e.getId(), p.getStartDate(), p.getEndDate())
                .stream().findFirst().orElse(null);
            if (rate == null) unconfigured++;

            String model = e.getPayrollModel() == null ? "hourly" : e.getPayrollModel();
            BigDecimal gross = computeGross(model, rate, workedHours, workedDays, overtimeHours);

            Payroll pr = payrolls.findByPeriodIdAndEmployeeId(periodId, e.getId()).orElseGet(Payroll::new);
            pr.setPeriodId(periodId);
            pr.setEmployeeId(e.getId());
            pr.setModel(model);
            pr.setWorkedHours(workedHours);
            pr.setWorkedShifts(workedDays);
            pr.setWorkedDays(workedDays);
            pr.setLateMinutes(lateMinutes);
            pr.setOvertimeMinutes(overtimeMinutes);
            pr.setGross(scale(gross));
            pr.setCurrency(rate != null && rate.getCurrency() != null ? rate.getCurrency() : "UZS");
            pr.setStatus("calculated");
            pr = payrolls.save(pr);

            // refresh auto adjustments (rule-based), keep manual ones
            adjustments.deleteAutoByPayrollId(pr.getId());
            applyRules(pr, activeRules, gross, lateMinutes, earlyLeaveMinutes, absentDays,
                holidayDays, nightDays, workedDays);

            recomputeTotals(pr);
            totalGross = totalGross.add(pr.getGross());
            totalNet = totalNet.add(pr.getNet());
        }

        p.setStatus("calculated");
        periods.save(p);

        String currency = active.isEmpty() ? "UZS"
            : payrolls.findByPeriodIdAndEmployeeId(periodId, active.get(0).getId())
                .map(Payroll::getCurrency).orElse("UZS");

        audit.record("PAYROLL_CALCULATE", "payroll_period", periodId,
            Map.of("employees", active.size(), "unconfigured", unconfigured, "totalNet", scale(totalNet)));
        return new RunSummary(periodId, active.size(), unconfigured,
            scale(totalGross), scale(totalNet), currency, "calculated");
    }

    private BigDecimal computeGross(String model, PayRate rate, BigDecimal workedHours,
                                    int workedDays, BigDecimal overtimeHours) {
        BigDecimal hourly = rate != null ? nz(rate.getHourlyRate()) : BigDecimal.ZERO;
        BigDecimal monthly = rate != null ? nz(rate.getMonthlySalary()) : BigDecimal.ZERO;
        BigDecimal perShift = rate != null ? nz(rate.getShiftRate()) : BigDecimal.ZERO;

        return switch (model) {
            case "hourly" -> workedHours.multiply(hourly);
            case "fixed_monthly" -> monthly;
            case "per_shift" -> perShift.multiply(BigDecimal.valueOf(workedDays));
            // mixed: monthly base + overtime hours paid hourly
            case "mixed" -> monthly.add(overtimeHours.multiply(hourly));
            default -> BigDecimal.ZERO;
        };
    }

    private void applyRules(Payroll pr, List<PayrollRule> activeRules, BigDecimal gross,
                            int lateMinutes, int earlyLeaveMinutes, int absentDays,
                            int holidayDays, int nightDays, int workedDays) {
        for (PayrollRule r : activeRules) {
            BigDecimal amount = null;
            String reason = r.getName();
            switch (nzs(r.getTrigger())) {
                case "zero_lateness" -> { if (lateMinutes == 0) amount = amountByType(r, gross, 1); }
                case "per_late_minute" -> {
                    if (lateMinutes > 0) { amount = amountByType(r, gross, lateMinutes); reason = r.getName() + " (" + lateMinutes + " daq.)"; }
                }
                case "early_leave" -> {
                    if (earlyLeaveMinutes > 0) { amount = amountByType(r, gross, earlyLeaveMinutes); reason = r.getName() + " (" + earlyLeaveMinutes + " daq.)"; }
                }
                case "absence" -> {
                    if (absentDays > 0) { amount = amountByType(r, gross, absentDays); reason = r.getName() + " (" + absentDays + " kun)"; }
                }
                // Holiday premium: paid per holiday actually worked (work_calendar day_type=holiday)
                case "holiday" -> {
                    if (holidayDays > 0) { amount = amountByType(r, gross, holidayDays); reason = r.getName() + " (" + holidayDays + " kun)"; }
                }
                // Night premium: paid per day worked on an overnight shift
                case "night" -> {
                    if (nightDays > 0) { amount = amountByType(r, gross, nightDays); reason = r.getName() + " (" + nightDays + " tun)"; }
                }
                // KPI / performance bonus: perfect attendance (no lateness, no absence)
                case "kpi" -> {
                    if (lateMinutes == 0 && absentDays == 0 && workedDays > 0) amount = amountByType(r, gross, 1);
                }
                // Income tax / social contribution: a deduction taken on gross
                case "income_tax" -> {
                    if (gross.signum() > 0) amount = amountByType(r, gross, 1);
                }
                default -> { }
            }
            if (amount != null && amount.signum() != 0) {
                PayrollAdjustment a = new PayrollAdjustment();
                a.setPayrollId(pr.getId());
                a.setRuleId(r.getId());
                a.setType(r.getType());
                a.setAmount(scale(amount.abs()));
                a.setReason(reason);
                adjustments.save(a);
            }
        }
    }

    /** value interpretation: fixed = value; percent = gross*value/100; per_minute = value*unit. */
    private BigDecimal amountByType(PayrollRule r, BigDecimal gross, int unit) {
        BigDecimal v = nz(r.getAmountValue());
        return switch (nzs(r.getAmountType())) {
            case "fixed" -> v;
            case "percent" -> gross.multiply(v).divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP);
            case "per_minute" -> v.multiply(BigDecimal.valueOf(unit));
            default -> BigDecimal.ZERO;
        };
    }

    private void recomputeTotals(Payroll pr) {
        List<PayrollAdjustment> list = adjustments.findByPayrollId(pr.getId());
        BigDecimal bonus = BigDecimal.ZERO, fine = BigDecimal.ZERO, deduction = BigDecimal.ZERO;
        for (PayrollAdjustment a : list) {
            BigDecimal amt = nz(a.getAmount());
            switch (a.getType()) {
                case "bonus", "allowance" -> bonus = bonus.add(amt);
                case "fine" -> fine = fine.add(amt);
                case "deduction", "advance" -> deduction = deduction.add(amt);
                default -> { }
            }
        }
        pr.setTotalBonus(scale(bonus));
        pr.setTotalFine(scale(fine));
        pr.setTotalDeduction(scale(deduction));
        // Net is floored at 0 — a payslip never pays a negative amount (carry-over is handled separately).
        BigDecimal net = nz(pr.getGross()).add(bonus).subtract(fine).subtract(deduction);
        pr.setNet(scale(net.max(BigDecimal.ZERO)));
        payrolls.save(pr);
    }

    // ---------------- Payrolls / payslips ----------------
    @Transactional(readOnly = true)
    public List<PayrollRow> listPayrolls(Long periodId) {
        Map<Long, String> names = employeeNames();
        return payrolls.findByPeriodIdOrderByEmployeeId(periodId).stream()
            .map(pr -> PayrollRow.from(pr, names.getOrDefault(pr.getEmployeeId(), "#" + pr.getEmployeeId())))
            .toList();
    }

    /** All payslips for one employee (self-service). */
    @Transactional(readOnly = true)
    public List<PayslipDto> payslipsForEmployee(Long employeeId) {
        return payrolls.findByEmployeeIdOrderByPeriodIdDesc(employeeId).stream()
            .map(pr -> getPayslip(pr.getId())).toList();
    }

    @Transactional(readOnly = true)
    public PayslipDto getPayslip(Long payrollId) {
        Payroll pr = payroll(payrollId);
        PayrollPeriod p = period(pr.getPeriodId());
        String name = employeeNames().getOrDefault(pr.getEmployeeId(), "#" + pr.getEmployeeId());
        List<AdjustmentDto> adj = adjustments.findByPayrollId(payrollId).stream().map(AdjustmentDto::from).toList();
        return new PayslipDto(PayrollRow.from(pr, name), PeriodDto.from(p), adj);
    }

    @Transactional
    public AdjustmentDto addAdjustment(Long payrollId, AdjustmentCreate req, Long userId) {
        Payroll pr = payroll(payrollId);
        requireOpenForEdit(pr);
        if (!ADJ_TYPES.contains(req.type()))
            throw ApiException.badRequest("Noto'g'ri tuzatma turi: " + req.type());

        PayrollAdjustment a = new PayrollAdjustment();
        a.setPayrollId(payrollId);
        a.setRuleId(null);
        a.setType(req.type());
        a.setAmount(scale(req.amount().abs()));
        a.setReason(req.reason());
        a.setCreatedBy(userId);
        a = adjustments.save(a);

        recomputeTotals(pr);
        audit.record("PAYROLL_ADJUSTMENT_ADD", "payroll", payrollId,
            Map.of("type", req.type(), "amount", scale(req.amount())));
        return AdjustmentDto.from(a);
    }

    @Transactional
    public AdjustmentDto updateAdjustment(Long payrollId, Long adjustmentId, AdjustmentCreate req) {
        Payroll pr = payroll(payrollId);
        requireOpenForEdit(pr);
        if (!ADJ_TYPES.contains(req.type()))
            throw ApiException.badRequest("Noto'g'ri tuzatma turi: " + req.type());
        PayrollAdjustment a = adjustments.findById(adjustmentId)
            .orElseThrow(() -> ApiException.notFound("Tuzatma topilmadi: " + adjustmentId));
        if (!a.getPayrollId().equals(payrollId))
            throw ApiException.badRequest("Tuzatma bu ish haqiga tegishli emas.");
        if (a.getRuleId() != null)
            throw ApiException.conflict("auto_adjustment", "Avtomatik tuzatmani tahrirlab bo'lmaydi (qoidani o'zgartiring).");
        a.setType(req.type());
        a.setAmount(scale(req.amount().abs()));
        a.setReason(req.reason());
        a = adjustments.save(a);
        recomputeTotals(pr);
        audit.record("PAYROLL_ADJUSTMENT_UPDATE", "payroll", payrollId,
            Map.of("adjustmentId", adjustmentId, "type", req.type(), "amount", scale(req.amount())));
        return AdjustmentDto.from(a);
    }

    @Transactional
    public void deleteAdjustment(Long payrollId, Long adjustmentId) {
        Payroll pr = payroll(payrollId);
        requireOpenForEdit(pr);
        PayrollAdjustment a = adjustments.findById(adjustmentId)
            .orElseThrow(() -> ApiException.notFound("Tuzatma topilmadi: " + adjustmentId));
        if (!a.getPayrollId().equals(payrollId))
            throw ApiException.badRequest("Tuzatma bu ish haqiga tegishli emas.");
        if (a.getRuleId() != null)
            throw ApiException.conflict("auto_adjustment", "Avtomatik tuzatmani o'chirib bo'lmaydi (qoidani o'chiring/o'zgartiring).");
        adjustments.delete(a);
        recomputeTotals(pr);
        audit.record("PAYROLL_ADJUSTMENT_DELETE", "payroll", payrollId, Map.of("adjustmentId", adjustmentId));
    }

    private void requireOpenForEdit(Payroll pr) {
        String st = period(pr.getPeriodId()).getStatus();
        if (!"open".equals(st) && !"calculated".equals(st))
            throw ApiException.conflict("period_locked", "Yopilgan/to'langan davrni o'zgartirib bo'lmaydi.");
    }

    // ---------------- Rules ----------------
    @Transactional(readOnly = true)
    public List<RuleDto> listRules() {
        return rules.findAll().stream()
            .sorted(Comparator.comparing(PayrollRule::getId))
            .map(PayrollService::ruleDto).toList();
    }

    @Transactional
    public RuleDto createRule(RuleCreate req) {
        validateRule(req);
        PayrollRule r = new PayrollRule();
        applyRule(r, req);
        r = rules.save(r);
        audit.record("PAYROLL_RULE_CREATE", "payroll_rule", r.getId(), Map.of("name", r.getName()));
        return ruleDto(r);
    }

    @Transactional
    public RuleDto updateRule(Long id, RuleCreate req) {
        validateRule(req);
        PayrollRule r = rules.findById(id).orElseThrow(() -> ApiException.notFound("Qoida topilmadi: " + id));
        applyRule(r, req);
        r = rules.save(r);
        audit.record("PAYROLL_RULE_UPDATE", "payroll_rule", id, Map.of("name", r.getName()));
        return ruleDto(r);
    }

    @Transactional
    public void deleteRule(Long id) {
        if (!rules.existsById(id)) throw ApiException.notFound("Qoida topilmadi: " + id);
        rules.deleteById(id);
        audit.record("PAYROLL_RULE_DELETE", "payroll_rule", id, null);
    }

    private void validateRule(RuleCreate req) {
        if (!RULE_TYPES.contains(req.type())) throw ApiException.badRequest("Noto'g'ri qoida turi: " + req.type());
        if (!RULE_TRIGGERS.contains(req.trigger())) throw ApiException.badRequest("Noto'g'ri trigger: " + req.trigger());
        if (!AMOUNT_TYPES.contains(req.amountType())) throw ApiException.badRequest("Noto'g'ri summa turi: " + req.amountType());
    }

    private void applyRule(PayrollRule r, RuleCreate req) {
        r.setName(req.name());
        r.setType(req.type());
        r.setTrigger(req.trigger());
        r.setAmountType(req.amountType());
        r.setAmountValue(req.amountValue());
        r.setIsActive(req.isActive() == null ? Boolean.TRUE : req.isActive());
    }

    private static RuleDto ruleDto(PayrollRule r) {
        return new RuleDto(r.getId(), r.getName(), r.getType(), r.getTrigger(),
            r.getAmountType(), r.getAmountValue(), r.getIsActive());
    }

    // ---------------- Individual payslip PDF ----------------
    @Transactional(readOnly = true)
    public byte[] payslipPdf(Long payrollId) {
        Payroll pr = payroll(payrollId);
        PayrollPeriod p = period(pr.getPeriodId());
        String name = employeeNames().getOrDefault(pr.getEmployeeId(), "#" + pr.getEmployeeId());
        String cur = pr.getCurrency();

        List<String> headers = List.of("Ko'rsatkich", "Qiymat");
        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("Xodim", name));
        rows.add(List.of("Davr", p.getName() + " (" + p.getStartDate() + " — " + p.getEndDate() + ")"));
        rows.add(List.of("Model", pr.getModel()));
        rows.add(List.of("Ishlangan soat", str(pr.getWorkedHours())));
        rows.add(List.of("Ishlangan kun", String.valueOf(nz(pr.getWorkedDays()))));
        rows.add(List.of("Kechikish (daq.)", String.valueOf(nz(pr.getLateMinutes()))));
        rows.add(List.of("Qo'shimcha ish (daq.)", String.valueOf(nz(pr.getOvertimeMinutes()))));
        rows.add(List.of("Brutto", str(pr.getGross()) + " " + cur));
        rows.add(List.of("Bonus", "+" + str(pr.getTotalBonus()) + " " + cur));
        rows.add(List.of("Jarima", "-" + str(pr.getTotalFine()) + " " + cur));
        rows.add(List.of("Ushlanma", "-" + str(pr.getTotalDeduction()) + " " + cur));
        rows.add(List.of("NETTO (sof to'lov)", str(pr.getNet()) + " " + cur));
        for (PayrollAdjustment a : adjustments.findByPayrollId(payrollId)) {
            rows.add(List.of("• " + a.getType() + (a.getRuleId() != null ? " (avto)" : ""),
                str(a.getAmount()) + " " + cur + " — " + (a.getReason() == null ? "" : a.getReason())));
        }
        return PdfExporter.export("Hisob varaqasi — " + name + " / " + p.getName(), headers, rows);
    }

    // ---------------- helpers ----------------
    private PayrollPeriod period(Long id) {
        return periods.findById(id).orElseThrow(() -> ApiException.notFound("Davr topilmadi: " + id));
    }
    private Payroll payroll(Long id) {
        return payrolls.findById(id).orElseThrow(() -> ApiException.notFound("Ish haqi topilmadi: " + id));
    }
    private Map<Long, String> employeeNames() {
        return employees.findAll().stream()
            .collect(Collectors.toMap(Employee::getId, e -> e.getLastName() + " " + e.getFirstName()));
    }
    private static BigDecimal minutesToHours(int minutes) {
        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), SCALE, RoundingMode.HALF_UP);
    }
    private static int nz(Integer v) { return v == null ? 0 : v; }
    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
    private static String nzs(String v) { return v == null ? "" : v; }
    private static String str(BigDecimal v) { return scale(v).toPlainString(); }
    private static BigDecimal scale(BigDecimal v) { return nz(v).setScale(SCALE, RoundingMode.HALF_UP); }
}
