package com.mardabang.hrms.payroll.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.payroll.entity.EmployeeCreditRecord;

public interface EmployeeCreditRepository extends JpaRepository<EmployeeCreditRecord, Long> {

    List<EmployeeCreditRecord> findByEmployeeId(Long employeeId);

    List<EmployeeCreditRecord> findByEmployeeIdAndStatus(Long employeeId, String status);

    List<EmployeeCreditRecord> findByFirmIdAndStatus(Long firmId, String status);
}