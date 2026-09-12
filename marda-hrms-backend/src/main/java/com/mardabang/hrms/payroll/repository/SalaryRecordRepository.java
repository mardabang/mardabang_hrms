package com.mardabang.hrms.payroll.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.payroll.entity.SalaryRecord;
import com.mardabang.hrms.payroll.dto.PaymentRequest;

public interface SalaryRecordRepository
        extends JpaRepository<SalaryRecord, Long> {

    Optional<SalaryRecord> findByEmployeeIdAndSalaryMonth(
            Long employeeId,
            LocalDate salaryMonth);

    List<SalaryRecord> findBySalaryMonthOrderByEmployeeIdAsc(
            LocalDate salaryMonth);

    List<SalaryRecord> findBySalaryMonthAndPaymentStatus(
            LocalDate salaryMonth,
            String paymentStatus);

    List<SalaryRecord> findAllByOrderBySalaryMonthDescEmployeeIdAsc();
    
    
}