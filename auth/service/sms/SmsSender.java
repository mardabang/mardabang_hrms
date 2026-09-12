package com.mardabang.hrms.auth.service.sms;

public interface SmsSender {
    /**
     * Sends a login OTP to the given mobile number.
     * @param mobile 10-digit Indian mobile number (no country code prefix)
     * @param otp    6-digit numeric OTP
     */
    void sendOtp(String mobile, String otp);
}
