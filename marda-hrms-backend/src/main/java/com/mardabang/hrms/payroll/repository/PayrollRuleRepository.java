package com.mardabang.hrms.payroll.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mardabang.hrms.payroll.entity.PayrollRule;

public interface PayrollRuleRepository extends JpaRepository<PayrollRule, Long> {

    Optional<PayrollRule> findByFirmCode(String firmCode);
}