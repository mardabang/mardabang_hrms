package com.mardabang.hrms.auth.service;

import com.mardabang.hrms.auth.entity.OtpCode;
import com.mardabang.hrms.auth.repository.OtpCodeRepository;
import com.mardabang.hrms.auth.service.sms.SmsSender;
import com.mardabang.hrms.user.entity.Role;
import com.mardabang.hrms.user.entity.User;
import com.mardabang.hrms.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Phone + OTP login for Supervisor (INPUTER) and Employee accounts — no
 * password involved anywhere in this flow. See PasswordResetService for the
 * separate Admin email/password reset flow.
 */
@Service
@Transactional
public class OtpService {

    private static final int OTP_LENGTH = 6;
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_REQUESTS_PER_HOUR = 5;
    private static final int MAX_VERIFY_ATTEMPTS = 5;
    private static final Set<Role> OTP_ROLES = Set.of(Role.INPUTER, Role.EMPLOYEE);

    private final OtpCodeRepository otpCodes;
    private final UserService userService;
    private final SmsSender smsSender;
    private final PasswordEncoder passwordEncoder; // reused to hash OTPs, not passwords
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpCodeRepository otpCodes, UserService userService,
                      SmsSender smsSender, PasswordEncoder passwordEncoder) {
        this.otpCodes = otpCodes;
        this.userService = userService;
        this.smsSender = smsSender;
        this.passwordEncoder = passwordEncoder;
    }

    public void requestOtp(String mobile) {
        User user = userService.getUserByMobile(mobile).orElse(null);

        // Deliberately vague on failure to avoid confirming which numbers are
        // registered, but recent-request throttling still applies below.
        if (user == null || !OTP_ROLES.contains(user.getRole()) || !Boolean.TRUE.equals(user.getActive())) {
            return;
        }

        Instant now = Instant.now();
        List<OtpCode> recent = otpCodes.findByMobileAndCreatedAtAfter(mobile, now.minus(Duration.ofHours(1)));
        if (!recent.isEmpty()) {
            Instant lastSent = recent.stream().map(OtpCode::getCreatedAt).max(Instant::compareTo).orElse(now);
            if (lastSent.plus(RESEND_COOLDOWN).isAfter(now)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait a minute before requesting another code.");
            }
            if (recent.size() >= MAX_REQUESTS_PER_HOUR) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many code requests. Please try again later.");
            }
        }

        String otp = generateOtp();
        OtpCode code = new OtpCode();
        code.setMobile(mobile);
        code.setCodeHash(passwordEncoder.encode(otp));
        code.setExpiresAt(now.plus(OTP_TTL));
        code.setAttempts(0);
        code.setUsed(false);
        code.setCreatedAt(now);
        otpCodes.save(code);

        smsSender.sendOtp(mobile, otp);
    }

    public User verifyOtp(String mobile, String code) {
        OtpCode otp = otpCodes.findTopByMobileAndUsedFalseOrderByCreatedAtDesc(mobile)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect or expired code."));

        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "This code has expired. Request a new one.");
        }
        if (otp.getAttempts() >= MAX_VERIFY_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many incorrect attempts. Request a new code.");
        }
        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpCodes.save(otp);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect or expired code.");
        }

        otp.setUsed(true);
        otpCodes.save(otp);

        User user = userService.getUserByMobile(mobile)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive.");
        }
        return user;
    }

    private String generateOtp() {
        int bound = (int) Math.pow(10, OTP_LENGTH);
        int value = random.nextInt(bound);
        return String.format("%0" + OTP_LENGTH + "d", value);
    }
}
