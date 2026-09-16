package com.mardabang.hrms.payroll.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.mardabang.hrms.payroll.entity.PayrollRule;
import com.mardabang.hrms.attendance.entity.*;
class AttendancePaidDaysTest {
    SalaryRecordService service=new SalaryRecordService(null,null,null,null,null,null);
    BigDecimal paid(AttendanceStatus status,boolean checkedIn,boolean weeklyPaid){var rule=mock(PayrollRule.class);when(rule.getWeeklyOffPaid()).thenReturn(weeklyPaid);var date=LocalDate.of(2026,9,15);var r=AttendanceRecord.builder().attendanceDate(date).status(status).checkInTime(checkedIn?LocalTime.of(9,0):null).build();return ReflectionTestUtils.invokeMethod(service,"calculatePaidDays",List.of(r),rule,date,date);}
    @Test void paidLeaveCountsAsPaid(){assertEquals(new BigDecimal("1.00"),paid(AttendanceStatus.PAID_LEAVE,false,false));}
    @Test void holidayCountsAsPaid(){assertEquals(new BigDecimal("1.00"),paid(AttendanceStatus.HOLIDAY,false,false));}
    @Test void missingCheckoutPreservesWorkedDay(){assertEquals(new BigDecimal("1.00"),paid(AttendanceStatus.MISSING_CHECKOUT,true,false));assertEquals(new BigDecimal("0.00"),paid(AttendanceStatus.MISSING_CHECKOUT,false,false));}
    @Test void weeklyOffRespectsCompanyPolicy(){assertEquals(new BigDecimal("0.00"),paid(AttendanceStatus.WEEKLY_OFF,false,false));assertEquals(new BigDecimal("1.00"),paid(AttendanceStatus.WEEKLY_OFF,false,true));}
}
