package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.Department;
import com.timegate.domain.Position;
import com.timegate.domain.Shift;
import com.timegate.domain.ShiftDay;
import com.timegate.domain.WorkCalendar;
import com.timegate.dto.OrgDtos.*;
import com.timegate.repo.DepartmentRepository;
import com.timegate.repo.EmployeeRepository;
import com.timegate.repo.PositionRepository;
import com.timegate.repo.ShiftDayRepository;
import com.timegate.repo.ShiftRepository;
import com.timegate.repo.WorkCalendarRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class OrgService {

    private static final Set<String> DAY_TYPES = Set.of("holiday", "weekend", "workday");

    private final DepartmentRepository departments;
    private final PositionRepository positions;
    private final ShiftRepository shifts;
    private final ShiftDayRepository shiftDays;
    private final EmployeeRepository employees;
    private final WorkCalendarRepository calendar;

    public OrgService(DepartmentRepository departments, PositionRepository positions,
                      ShiftRepository shifts, ShiftDayRepository shiftDays,
                      EmployeeRepository employees, WorkCalendarRepository calendar) {
        this.departments = departments;
        this.positions = positions;
        this.shifts = shifts;
        this.shiftDays = shiftDays;
        this.employees = employees;
        this.calendar = calendar;
    }

    // ---- Departments ----
    @Transactional(readOnly = true)
    public List<DepartmentDto> listDepartments() {
        return departments.findAll().stream().map(DepartmentDto::from).toList();
    }

    @Transactional
    public DepartmentDto createDepartment(DepartmentCreate req) {
        Department d = new Department();
        d.setName(req.name());
        d.setManagerId(req.managerId());
        return DepartmentDto.from(departments.save(d));
    }

    @Transactional
    public DepartmentDto updateDepartment(Long id, DepartmentCreate req) {
        Department d = departments.findById(id)
            .orElseThrow(() -> ApiException.notFound("Bo'lim topilmadi: " + id));
        d.setName(req.name());
        d.setManagerId(req.managerId());
        return DepartmentDto.from(departments.save(d));
    }

    @Transactional
    public void deleteDepartment(Long id) {
        Department d = departments.findById(id)
            .orElseThrow(() -> ApiException.notFound("Bo'lim topilmadi: " + id));
        if (employees.countByDepartmentId(id) > 0)
            throw ApiException.conflict("in_use", "Bu bo'limga biriktirilgan xodimlar bor — avval ularni boshqa bo'limga o'tkazing.");
        departments.delete(d);
    }

    // ---- Positions ----
    @Transactional(readOnly = true)
    public List<PositionDto> listPositions() {
        return positions.findAll().stream().map(PositionDto::from).toList();
    }

    @Transactional
    public PositionDto createPosition(PositionCreate req) {
        Position p = new Position();
        p.setTitle(req.title());
        return PositionDto.from(positions.save(p));
    }

    @Transactional
    public PositionDto updatePosition(Long id, PositionCreate req) {
        Position p = positions.findById(id)
            .orElseThrow(() -> ApiException.notFound("Lavozim topilmadi: " + id));
        p.setTitle(req.title());
        return PositionDto.from(positions.save(p));
    }

    @Transactional
    public void deletePosition(Long id) {
        Position p = positions.findById(id)
            .orElseThrow(() -> ApiException.notFound("Lavozim topilmadi: " + id));
        if (employees.countByPositionId(id) > 0)
            throw ApiException.conflict("in_use", "Bu lavozimdagi xodimlar bor — avval ularning lavozimini o'zgartiring.");
        positions.delete(p);
    }

    // ---- Holidays / work calendar ----
    @Transactional(readOnly = true)
    public List<HolidayDto> listHolidays(Integer year) {
        List<WorkCalendar> rows = (year == null)
            ? calendar.findAllByOrderByCalendarDate()
            : calendar.findByCalendarDateBetweenOrderByCalendarDate(
                LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
        return rows.stream().map(HolidayDto::from).toList();
    }

    @Transactional
    public HolidayDto createHoliday(HolidayCreate req) {
        validateDayType(req.dayType());
        if (calendar.findByCalendarDate(req.date()).isPresent())
            throw ApiException.conflict("duplicate_date", "Bu sana uchun yozuv allaqachon mavjud: " + req.date());
        WorkCalendar c = new WorkCalendar();
        c.setCalendarDate(req.date());
        c.setDayType(req.dayType());
        c.setDescription(req.description());
        return HolidayDto.from(calendar.save(c));
    }

    @Transactional
    public HolidayDto updateHoliday(Long id, HolidayCreate req) {
        validateDayType(req.dayType());
        WorkCalendar c = calendar.findById(id)
            .orElseThrow(() -> ApiException.notFound("Kalendar yozuvi topilmadi: " + id));
        calendar.findByCalendarDate(req.date())
            .filter(other -> !other.getId().equals(id))
            .ifPresent(other -> { throw ApiException.conflict("duplicate_date", "Bu sana uchun yozuv allaqachon mavjud: " + req.date()); });
        c.setCalendarDate(req.date());
        c.setDayType(req.dayType());
        c.setDescription(req.description());
        return HolidayDto.from(calendar.save(c));
    }

    @Transactional
    public void deleteHoliday(Long id) {
        if (!calendar.existsById(id)) throw ApiException.notFound("Kalendar yozuvi topilmadi: " + id);
        calendar.deleteById(id);
    }

    private void validateDayType(String dayType) {
        if (!DAY_TYPES.contains(dayType))
            throw ApiException.badRequest("Noto'g'ri kun turi: " + dayType);
    }

    // ---- Shifts ----
    @Transactional(readOnly = true)
    public List<ShiftDto> listShifts() {
        return shifts.findAll().stream()
            .map(s -> ShiftDto.from(s, weekdaysOf(s.getId())))
            .toList();
    }

    @Transactional
    public ShiftDto createShift(ShiftCreate req) {
        Shift s = new Shift();
        s.setName(req.name());
        s.setStartTime(req.startTime());
        s.setEndTime(req.endTime());
        s.setBreakMinutes(req.breakMinutes() == null ? 0 : req.breakMinutes());
        s.setGraceInMinutes(req.graceInMinutes() == null ? 0 : req.graceInMinutes());
        s.setGraceOutMinutes(req.graceOutMinutes() == null ? 0 : req.graceOutMinutes());
        s.setOvertimeAfterMin(req.overtimeAfterMin());
        s.setIsOvernight(req.isOvernight() != null && req.isOvernight());
        s = shifts.save(s);
        saveWeekdays(s.getId(), req.weekdays());
        return ShiftDto.from(s, weekdaysOf(s.getId()));
    }

    private void saveWeekdays(Long shiftId, List<Integer> weekdays) {
        shiftDays.deleteByShiftId(shiftId);
        if (weekdays != null) {
            for (Integer wd : weekdays) {
                ShiftDay d = new ShiftDay();
                d.setShiftId(shiftId);
                d.setWeekday(wd.shortValue());
                shiftDays.save(d);
            }
        }
    }

    private List<Integer> weekdaysOf(Long shiftId) {
        return shiftDays.findByShiftId(shiftId).stream()
            .map(d -> (int) (short) d.getWeekday())
            .sorted()
            .toList();
    }
}
