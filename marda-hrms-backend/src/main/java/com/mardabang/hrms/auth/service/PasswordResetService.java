package com.mardabang.hrms.auth.service;

import com.mardabang.hrms.auth.entity.PasswordResetToken;
import com.mardabang.hrms.auth.repository.PasswordResetTokenRepository;
import com.mardabang.hrms.auth.service.email.EmailSender;
import com.mardabang.hrms.user.entity.Role;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Email + link based password reset — Admin only. Supervisors and Employees
 * don't have passwords at all (see OtpService), so this flow never applies
 * to them, even if an ADMIN-created account happens to have a mobile number.
 */
@Service
@Transactional
public class PasswordResetService {

    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);

    private final PasswordResetTokenRepository tokens;
    private final UserService userService;
    private final EmailSender emailSender;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(PasswordResetTokenRepository tokens, UserService userService,
                                EmailSender emailSender) {
        this.tokens = tokens;
        this.userService = userService;
        this.emailSender = emailSender;
        
    }

    public void forgotPassword(String email) {
        User user = userService.getUserByEmail(email).orElse(null);

        // Same email/no-op regardless of outcome — don't reveal whether the address exists.
        if (user == null || user.getRole() != Role.ADMIN || !Boolean.TRUE.equals(user.getActive())) {
            return;
        }

        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setTokenHash(sha256(rawToken));
        token.setExpiresAt(Instant.now().plus(TOKEN_TTL));
        token.setUsed(false);
        token.setCreatedAt(Instant.now());
        tokens.save(token);

        emailSender.sendPasswordResetEmail(user.getEmail(), rawToken);
    }

    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetToken token = tokens.findByTokenHashAndUsedFalse(sha256(rawToken))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link is invalid or has already been used."));

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link has expired. Request a new one.");
        }

        User user = userService.getUserById(token.getUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found."));
        if (user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This reset link is not valid for this account.");
        }

        user.setPassword(newPassword);
        userService.saveUser(user);

        token.setUsed(true);
        tokens.save(token);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest.digest(value.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
