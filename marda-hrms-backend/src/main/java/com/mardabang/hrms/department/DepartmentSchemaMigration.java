package com.mardabang.hrms.department;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@Order(-110)
@RequiredArgsConstructor
public class DepartmentSchemaMigration implements ApplicationRunner {
    private static final String CONSTRAINT_NAME = "fk_employees_department";
    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        Integer signedColumn = jdbc.queryForObject("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='employees'
              AND column_name='department_id' AND column_type='bigint'
            """, Integer.class);
        if (signedColumn != null && signedColumn > 0) {
            jdbc.execute("ALTER TABLE employees MODIFY COLUMN department_id BIGINT UNSIGNED NULL");
        }

        jdbc.update("""
            UPDATE employees employee
            LEFT JOIN departments department ON department.id=employee.department_id
            SET employee.department_id=NULL
            WHERE employee.department_id IS NOT NULL AND department.id IS NULL
            """);

        Integer constraint = jdbc.queryForObject("""
            SELECT COUNT(*) FROM information_schema.referential_constraints
            WHERE constraint_schema=DATABASE() AND table_name='employees'
              AND referenced_table_name='departments'
            """, Integer.class);
        if (constraint == null || constraint == 0) {
            jdbc.execute("ALTER TABLE employees ADD CONSTRAINT " + CONSTRAINT_NAME
                    + " FOREIGN KEY (department_id) REFERENCES departments(id)");
        }
    }
}
