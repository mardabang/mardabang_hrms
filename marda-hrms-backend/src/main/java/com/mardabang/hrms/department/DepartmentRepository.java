package com.mardabang.hrms.department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface DepartmentRepository extends JpaRepository<Department,Long> {
    List<Department> findByFirmIdOrderByNameAsc(Long firmId);
    Optional<Department> findByFirmIdAndNameKey(Long firmId,String nameKey);
}
