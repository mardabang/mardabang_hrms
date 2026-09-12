package com.mardabang.hrms.auth.service.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends transactional emails (currently just password reset links) via
 * Spring's JavaMailSender. Configure any SMTP provider in application.properties:
 *
 *   spring.mail.host=smtp.gmail.com
 *   spring.mail.port=587
 *   spring.mail.username=<your address>
 *   spring.mail.password=<app password, not your real password>
 *   spring.mail.properties.mail.smtp.auth=true
 *   spring.mail.properties.mail.smtp.starttls.enable=true
 *
 * Gmail works fine at low admin-only volume with an "app password". For
 * anything beyond a handful of emails/day, a transactional provider like
 * Brevo (free tier) or SendGrid is more reliable and just needs the same
 * SMTP properties swapped to their host/credentials.
 */
@Component
public class EmailSender {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String resetLinkBaseUrl;

    public EmailSender(JavaMailSender mailSender,
                       @Value("${app.mail.from}") String fromAddress,
                       @Value("${app.reset-password.base-url}") String resetLinkBaseUrl) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.resetLinkBaseUrl = resetLinkBaseUrl;
    }

    public void sendPasswordResetEmail(String toEmail, String rawToken) {
        String link = resetLinkBaseUrl + "?token=" + rawToken;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("Reset your Marda Bang HRMS password");
        message.setText(
            "We received a request to reset your HRMS admin password.\n\n" +
            "Click the link below to set a new password. This link expires in 30 minutes " +
            "and can only be used once.\n\n" + link + "\n\n" +
            "If you did not request this, you can ignore this email — your password will not change."
        );
        mailSender.send(message);
    }
}
