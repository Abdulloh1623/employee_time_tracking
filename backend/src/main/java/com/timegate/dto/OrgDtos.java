package com.timegate.dto;

import com.timegate.domain.Department;
import com.timegate.domain.Position;
import com.timegate.domain.Shift;
import com.timegate.domain.WorkCalendar;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public final class OrgDtos {
    private OrgDtos() {}

    public record DepartmentDto(Long id, String name, Long managerId) {
        public static DepartmentDto from(Department d) {
            return new DepartmentDto(d.getId(), d.getName(), d.getManagerId());
        }
    }
    public record DepartmentCreate(@NotBlank String name, Long managerId) {}

    public record PositionDto(Long id, String title) {
        public static PositionDto from(Position p) { return new PositionDto(p.getId(), p.getTitle()); }
    }
    public record PositionCreate(@NotBlank String title) {}

    // ---- Holidays / work calendar ----
    public record HolidayDto(Long id, LocalDate date, String dayType, String description) {
        public static HolidayDto from(WorkCalendar c) {
            return new HolidayDto(c.getId(), c.getCalendarDate(), c.getDayType(), c.getDescription());
        }
    }
    public record HolidayCreate(
        @NotNull LocalDate date,
        @NotBlank String dayType,        // holiday | weekend | workday
        String description) {}

    public record ShiftDto(Long id, String name, LocalTime startTime, LocalTime endTime,
                           Integer breakMinutes, Integer graceInMinutes, Integer graceOutMinutes,
                           Integer overtimeAfterMin, Boolean isOvernight, List<Integer> weekdays) {
        public static ShiftDto from(Shift s, List<Integer> weekdays) {
            return new ShiftDto(s.getId(), s.getName(), s.getStartTime(), s.getEndTime(),
                s.getBreakMinutes(), s.getGraceInMinutes(), s.getGraceOutMinutes(),
                s.getOvertimeAfterMin(), s.getIsOvernight(), weekdays);
        }
    }
    public record ShiftCreate(
        @NotBlank String name,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        Integer breakMinutes,
        Integer graceInMinutes,
        Integer graceOutMinutes,
        Integer overtimeAfterMin,
        Boolean isOvernight,
        List<Integer> weekdays) {}
}
