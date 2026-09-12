package com.mardabang.hrms.auth.service.sms;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Local-testing SmsSender — prints the OTP to the console instead of sending
 * a real SMS. Active by default (app.sms.provider unset, or set to
 * "console"), so a fresh checkout works out of the box without needing
 * MSG91 credentials.
 *
 * Switch to real SMS by setting in application.properties:
 *   app.sms.provider=msg91
 */
@Component
@ConditionalOnProperty(prefix = "app.sms", name = "provider", havingValue = "console", matchIfMissing = true)
public class ConsoleSmsSender implements SmsSender {

    @Override
    public void sendOtp(String mobile, String otp) {
        System.out.println("=== [DEV] OTP for " + mobile + ": " + otp + " (not sent via real SMS) ===");
    }
}