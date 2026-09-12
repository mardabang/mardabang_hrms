package com.mardabang.hrms.auth.service.sms;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Sends OTP SMS via MSG91's OTP API (https://api.msg91.com/api/v5/otp).
 * Only active when app.sms.provider=msg91 in application.properties —
 * otherwise ConsoleSmsSender is used instead (see that class for the
 * local-dev default). This keeps the credentials-required path opt-in, so
 * the app still boots and OTP login is still testable before MSG91 is set up.
 *
 * Required application.properties when using this provider:
 *   app.sms.provider=msg91
 *   app.sms.msg91.authkey=<your MSG91 auth key>
 *   app.sms.msg91.template-id=<your approved OTP DLT template id>
 *   app.sms.msg91.sender-id=<your 6-char sender id, e.g. MRDBNG>
 */
@Component
@ConditionalOnProperty(prefix = "app.sms", name = "provider", havingValue = "msg91")
public class Msg91SmsSender implements SmsSender {

    private final String authKey;
    private final String templateId;
    private final String senderId;
    private final RestTemplate restTemplate = new RestTemplate();

    public Msg91SmsSender(@Value("${app.sms.msg91.authkey}") String authKey,
                          @Value("${app.sms.msg91.template-id}") String templateId,
                          @Value("${app.sms.msg91.sender-id}") String senderId) {
        this.authKey = authKey;
        this.templateId = templateId;
        this.senderId = senderId;
    }

    @Override
    public void sendOtp(String mobile, String otp) {
        String url = UriComponentsBuilder.fromHttpUrl("https://control.msg91.com/api/v5/otp")
                .queryParam("template_id", templateId)
                .queryParam("mobile", "91" + mobile)
                .queryParam("authkey", authKey)
                .queryParam("otp", otp)
                .queryParam("sender", senderId)
                .toUriString();

        // MSG91 returns 200 with a JSON body even on some failures; for production
        // you should parse the response body and throw on type != "success".
        restTemplate.postForEntity(url, null, String.class);
    }
}