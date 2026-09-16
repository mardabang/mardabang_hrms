package com.mardabang.hrms.attendance.service;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
class AttendanceSchemaMigrationTest {
    @Test void neverDeletesDuplicates(){var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForObject(anyString(),eq(Integer.class))).thenReturn(1);assertThrows(IllegalStateException.class,()->new AttendanceSchemaMigration(jdbc).run(null));verify(jdbc,never()).execute(anyString());}
    @Test void existingUniqueIndexIsNotRecreated(){var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForObject(anyString(),eq(Integer.class))).thenReturn(0,1);new AttendanceSchemaMigration(jdbc).run(null);verify(jdbc,never()).execute(anyString());}
}
