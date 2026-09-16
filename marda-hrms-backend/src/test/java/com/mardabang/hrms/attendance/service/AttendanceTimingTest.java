package com.mardabang.hrms.attendance.service;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.mardabang.hrms.attendance.entity.*;
import com.mardabang.hrms.attendance.repository.AttendanceRepository;
import org.springframework.test.util.ReflectionTestUtils;
class AttendanceTimingTest {
    AttendanceRepository repo=mock(AttendanceRepository.class);
    AttendanceService service(String time){return new AttendanceService(mock(AttendanceLocationPolicy.class),repo,mock(AttendanceAccess.class),Clock.fixed(LocalDateTime.parse("2026-09-15T"+time).atZone(ZoneId.of("Asia/Kolkata")).toInstant(),ZoneId.of("Asia/Kolkata")));}
    AttendanceRecord record(){return AttendanceRecord.builder().id(1L).employeeCode("EMP1").firmCode("MBIPL").attendanceDate(LocalDate.of(2026,9,15)).shift("EIGHT_HOURS").checkInTime(LocalTime.of(9,0)).status(AttendanceStatus.PRESENT).build();}
    void records(AttendanceRecord r){when(repo.findByCheckInTimeIsNotNullAndCheckOutTimeIsNullAndAttendanceDateLessThanEqual(any())).thenReturn(List.of(r));}
    @Test void doesNotFlagEmployeeDuringShift(){records(record());service("10:00:00").markMissingCheckouts();verify(repo,never()).markMissingCheckout(any(),any(),any());}
    @Test void flagsOnlyAfterConfiguredEnd(){records(record());service("17:01:00").markMissingCheckouts();verify(repo).markMissingCheckout(eq(1L),eq(AttendanceStatus.MISSING_CHECKOUT),any());}
    @Test void completedCheckoutIsNeverFlagged(){var r=record();r.setCheckOutTime(LocalTime.of(17,0));r.setStatus(AttendanceStatus.COMPLETED);records(r);service("18:00:00").markMissingCheckouts();verify(repo,never()).markMissingCheckout(any(),any(),any());}
    @Test void paidLeaveIsNotFlagged(){var r=record();r.setStatus(AttendanceStatus.PAID_LEAVE);records(r);service("18:00:00").markMissingCheckouts();verify(repo,never()).markMissingCheckout(any(),any(),any());}
    @Test void previousDayOpenAttendanceIsFlagged(){var r=record();r.setAttendanceDate(r.getAttendanceDate().minusDays(1));records(r);service("10:00:00").markMissingCheckouts();verify(repo).markMissingCheckout(eq(1L),eq(AttendanceStatus.MISSING_CHECKOUT),any());}
    @Test void lateThresholdUsesPublishedShiftStart(){var result=ReflectionTestUtils.invokeMethod(service("10:00:00"),"determineStatus","EIGHT_HOURS",LocalTime.of(9,5));assertEquals(AttendanceStatus.PRESENT,result);}
}
