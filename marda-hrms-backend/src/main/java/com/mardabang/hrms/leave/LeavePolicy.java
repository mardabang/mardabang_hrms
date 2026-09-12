package com.mardabang.hrms.leave;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class LeavePolicy {
    public final int supervisorLimit;
    public final Set<DayOfWeek> weeklyOffDays;
    public final Set<LocalDate> holidays;
    public final ZoneId zone;

    public LeavePolicy(
        @Value("${app.leave.supervisor-max-days:2}") int limit,
        @Value("${app.leave.weekly-off-days:SUNDAY}") String weeklyOffs,
        @Value("${app.leave.holidays:}") String dates,
        @Value("${app.leave.time-zone:Asia/Kolkata}") String timeZone) {
        if (limit < 0) throw new IllegalArgumentException("Leave approval limit cannot be negative");
        supervisorLimit = limit;
        weeklyOffDays = Arrays.stream(weeklyOffs.split(",")).map(String::trim)
            .filter(s -> !s.isEmpty()).map(s -> DayOfWeek.valueOf(s.toUpperCase(Locale.ROOT))).collect(Collectors.toSet());
        holidays = Arrays.stream(dates.split(",")).map(String::trim)
            .filter(s -> !s.isEmpty()).map(LocalDate::parse).collect(Collectors.toSet());
        zone = ZoneId.of(timeZone);
    }

    public int days(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from) || to.isAfter(from.plusYears(1))) {
            throw new IllegalArgumentException("Choose valid leave dates, no more than one year apart.");
        }
        return (int) from.datesUntil(to.plusDays(1))
            .filter(d -> !weeklyOffDays.contains(d.getDayOfWeek()) && !holidays.contains(d)).count();
    }
}
