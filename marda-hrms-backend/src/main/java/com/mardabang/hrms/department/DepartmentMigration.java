package com.mardabang.hrms.department;
import java.util.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.firms.entity.Firm;
@Component @Order(-100) @RequiredArgsConstructor
public class DepartmentMigration implements ApplicationRunner {
    private final DepartmentRepository departments;
    private final FirmRepository firms;
    private final JdbcTemplate jdbc;
    private static final List<String> TEXTILE=List.of("General","Warping","Sizing","Size Preparation","Boiler & Utilities","Maintenance","Quality Control","Stores","Dispatch","Administration & HR","Accounts","Security & Housekeeping");
    @Override @Transactional public void run(ApplicationArguments args) {
        for(Firm firm:firms.findAll()) {
            List<String> legacy=jdbc.queryForList("SELECT DISTINCT department FROM employees WHERE firm_id=? AND department IS NOT NULL AND TRIM(department)<>''",String.class,firm.getId());
            Set<String> names=new LinkedHashSet<>();
            if(departments.findByFirmIdOrderByNameAsc(firm.getId()).isEmpty()) names.addAll(TEXTILE);
            names.addAll(legacy);
            for(String raw:names) {
                String name=DepartmentService.normalize(raw),key=DepartmentService.key(name);
                Department d=departments.findByFirmIdAndNameKey(firm.getId(),key).orElseGet(()->{
                    Department created=new Department();created.setFirm(firm);created.setName(name);created.setNameKey(key);
                    created.setActive(TEXTILE.stream().anyMatch(n->n.equalsIgnoreCase(name)));
                    return departments.saveAndFlush(created);
                });
                jdbc.update("UPDATE employees SET department_id=?, department=? WHERE firm_id=? AND TRIM(department)=? AND department_id IS NULL",d.getId(),d.getName(),firm.getId(),raw.trim());
            }
        }
        // Retire the obsolete Team field without deleting historical values.
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='attendance_records' AND column_name='team' AND is_nullable='NO'",Integer.class);
        if(count!=null&&count>0)jdbc.execute("ALTER TABLE attendance_records MODIFY COLUMN team VARCHAR(255) NULL");
    }
}
