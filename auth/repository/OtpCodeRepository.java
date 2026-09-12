package com.mardabang.hrms.auth.repository;

import com.mardabang.hrms.auth.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    Optional<OtpCode> findTopByMobileAndUsedFalseOrderByCreatedAtDesc(String mobile);

    List<OtpCode> findByMobileAndCreatedAtAfter(String mobile, Instant after);
}
