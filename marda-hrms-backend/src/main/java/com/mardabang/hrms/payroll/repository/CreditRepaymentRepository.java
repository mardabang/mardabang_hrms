package com.mardabang.hrms.payroll.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.payroll.entity.CreditRepayment;

public interface CreditRepaymentRepository extends JpaRepository<CreditRepayment, Long> {

    List<CreditRepayment> findByCreditRecordId(Long creditRecordId);

    List<CreditRepayment> findByCreditRecordIdInOrderByRepaymentDateAsc(List<Long> creditRecordIds);
}