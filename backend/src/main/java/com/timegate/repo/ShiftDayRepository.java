package com.timegate.repo;

import com.timegate.domain.ShiftDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ShiftDayRepository extends JpaRepository<ShiftDay, Long> {
    List<ShiftDay> findByShiftId(Long shiftId);

    @Modifying
    @Query("DELETE FROM ShiftDay d WHERE d.shiftId = :shiftId")
    void deleteByShiftId(@Param("shiftId") Long shiftId);
}
