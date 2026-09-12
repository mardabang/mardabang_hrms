package com.mardabang.hrms.firms.repository;

import com.mardabang.hrms.firms.entity.Firm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FirmRepository extends JpaRepository<Firm, Long> {

    Optional<Firm> findByCode(String code);

    boolean existsByCode(String code);
}