package com.mardabang.hrms.auth.repository;

import com.mardabang.hrms.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHashAndUsedFalse(String tokenHash);
}