package com.mardabang.hrms.employee.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.employee.entity.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByEmployeeCode(String employeeCode);

    List<Employee> findByDepartment(String department);

    List<Employee> findByStatus(String status);

    boolean existsByEmployeeCode(String employeeCode);
    
    List<Employee> findByFirmId(Long firmId);
    
    List<Employee> findByCreatedByUserId(Long createdByUserId);
}
