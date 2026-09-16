package com.mardabang.hrms.employee.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.employee.entity.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Employee e where e.employeeCode = :code")
    Optional<Employee> findForAttendance(@org.springframework.data.repository.query.Param("code") String code);

    Optional<Employee> findByEmployeeCode(String employeeCode);

    List<Employee> findByDepartment(String department);

    List<Employee> findByStatus(String status);

    boolean existsByEmployeeCode(String employeeCode);
    
    List<Employee> findByFirmId(Long firmId);
    
    List<Employee> findByCreatedByUserId(Long createdByUserId);
}
