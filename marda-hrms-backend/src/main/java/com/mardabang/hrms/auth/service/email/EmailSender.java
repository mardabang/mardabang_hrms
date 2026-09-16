package com.mardabang.hrms.auth.service.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class EmailSender {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String resetLinkBaseUrl;

    public EmailSender(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String fromAddress,
            @Value("${app.reset-password.base-url}") String resetLinkBaseUrl) {

        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.resetLinkBaseUrl = resetLinkBaseUrl;
    }

    public void sendPasswordResetEmail(
            String toEmail,
            String rawToken) {

        String link =
                resetLinkBaseUrl +
                "?token=" +
                rawToken;

        SimpleMailMessage message =
                new SimpleMailMessage();

        message.setFrom(fromAddress);

        message.setTo(toEmail);

        message.setSubject(
                "Reset your Marda Bang HRMS password"
        );

        message.setText(
            "Hello,\n\n" +

            "We received a request to reset your " +
            "Marda Bang HRMS password.\n\n" +

            "Click the link below to create a new password:\n\n" +

            link + "\n\n" +

            "This link is valid for 30 minutes and can " +
            "only be used once.\n\n" +

            "If you did not request this password reset, " +
            "you can safely ignore this email.\n\n" +

            "Regards,\n" +
            "Marda Bang HRMS"
        );

        mailSender.send(message);
    }
}