package com.mardabang.hrms.auth.service;

import com.mardabang.hrms.auth.entity.PasswordResetToken;
import com.mardabang.hrms.auth.repository.PasswordResetTokenRepository;
import com.mardabang.hrms.auth.service.email.EmailSender;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
@Transactional
public class PasswordResetService {

    private static final Duration TOKEN_TTL =
            Duration.ofMinutes(30);

    private final PasswordResetTokenRepository tokens;
    private final UserService userService;
    private final EmailSender emailSender;

    private final SecureRandom random =
            new SecureRandom();

    public PasswordResetService(
            PasswordResetTokenRepository tokens,
            UserService userService,
            EmailSender emailSender) {

        this.tokens = tokens;
        this.userService = userService;
        this.emailSender = emailSender;
    }

    // ============================================================
    // FORGOT PASSWORD
    // ============================================================

    public void forgotPassword(String email) {

        User user =
                userService.getUserByEmail(email)
                        .orElse(null);

        /*
         * Do not reveal whether the email exists.
         *
         * All active roles are allowed:
         * ADMIN
         * INPUTER = Supervisor
         * EMPLOYEE
         */
        if (user == null
                || !Boolean.TRUE.equals(user.getActive())
                || user.getEmail() == null
                || user.getEmail().isBlank()) {

            return;
        }

        byte[] tokenBytes = new byte[32];

        random.nextBytes(tokenBytes);

        String rawToken =
                Base64.getUrlEncoder()
                        .withoutPadding()
                        .encodeToString(tokenBytes);

        PasswordResetToken token =
                new PasswordResetToken();

        token.setUserId(user.getId());

        token.setTokenHash(
                sha256(rawToken)
        );

        token.setExpiresAt(
                Instant.now().plus(TOKEN_TTL)
        );

        token.setUsed(false);

        token.setCreatedAt(
                Instant.now()
        );

        tokens.save(token);

        emailSender.sendPasswordResetEmail(
                user.getEmail(),
                rawToken
        );
    }

    // ============================================================
    // RESET PASSWORD
    // ============================================================

    public void resetPassword(
            String rawToken,
            String newPassword) {

        if (rawToken == null
                || rawToken.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Reset token is required."
            );
        }

        if (newPassword == null
                || newPassword.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "New password is required."
            );
        }

        PasswordResetToken token =
                tokens.findByTokenHashAndUsedFalse(
                        sha256(rawToken)
                )
                .orElseThrow(() ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "This reset link is invalid or has already been used."
                    )
                );

        if (token.getExpiresAt() == null
                || token.getExpiresAt()
                        .isBefore(Instant.now())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This reset link has expired. Request a new one."
            );
        }

        User user =
                userService.getUserById(
                        token.getUserId()
                )
                .orElseThrow(() ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Account not found."
                    )
                );

        if (!Boolean.TRUE.equals(user.getActive())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This account is inactive."
            );
        }

        /*
         * UserService.saveUser() encodes the new raw password.
         */
        user.setPassword(newPassword);

        userService.saveUser(user);

        /*
         * Token becomes unusable after successful reset.
         */
        token.setUsed(true);

        tokens.save(token);
    }

    // ============================================================
    // SHA-256 TOKEN HASH
    // ============================================================

    private String sha256(String value) {

        try {

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash =
                    digest.digest(
                        value.getBytes(StandardCharsets.UTF_8)
                    );

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(hash);

        } catch (NoSuchAlgorithmException e) {

            throw new IllegalStateException(
                    "SHA-256 algorithm is not available.",
                    e
            );
        }
    }
}