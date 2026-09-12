# Auth updates — integration notes

## 1. New files (drop into matching packages)
- auth/entity/OtpCode.java
- auth/entity/PasswordResetToken.java
- auth/repository/OtpCodeRepository.java
- auth/repository/PasswordResetTokenRepository.java
- auth/service/OtpService.java
- auth/service/PasswordResetService.java
- auth/service/sms/SmsSender.java
- auth/service/sms/Msg91SmsSender.java
- auth/service/email/EmailSender.java

## 2. Replace existing files
- auth/controller/AuthController.java
- auth/dto/RegisterRequest.java
- config/SecurityConfig.java

## 3. Requires two methods on UserService (not included — I don't have that file)
```java
Optional<User> getUserByMobile(String mobile);
Optional<User> getUserById(Long id);
```
`getUserByMobile` needs a matching `findByMobile(String mobile)` on your `UserRepository`.
If `getUserById` already exists under another name, just adjust the two call sites in
`PasswordResetService`.

## 4. New Maven dependency
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```
(`RestTemplate` used by Msg91SmsSender is already on the classpath via spring-boot-starter-web.)

## 5. application.properties additions
```properties
# SMS (MSG91) — for OTP login, Supervisor/Employee
app.sms.msg91.authkey=<your MSG91 auth key>
app.sms.msg91.template-id=<your approved OTP DLT template id>
app.sms.msg91.sender-id=<your 6-char sender id>

# Email (SMTP) — for Admin forgot-password
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=<your address>
spring.mail.password=<app password>
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
app.mail.from=<your address>
app.reset-password.base-url=<your frontend's reset-password page URL>
```

## 6. New API endpoints
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /api/auth/otp/request | public | `{ "mobile": "9876543210" }` |
| POST | /api/auth/otp/verify | public | `{ "mobile": "9876543210", "code": "123456" }` → returns LoginResponse (same shape as /login) |
| POST | /api/auth/forgot-password | public | `{ "email": "admin@example.com" }` |
| POST | /api/auth/reset-password | public | `{ "token": "...", "newPassword": "..." }` |

`/api/auth/login` is now effectively Admin-only — it returns 401 with a clear message if a
Supervisor/Employee account tries it, telling them to use OTP instead.

## 7. What DB migration you'll need
Two new tables (Hibernate `ddl-auto: update` will create these on next boot, same as it did
for `employee_leave_requests`):
- `otp_codes` (mobile, codeHash, expiresAt, attempts, used, createdAt)
- `password_reset_tokens` (userId, tokenHash, expiresAt, used, createdAt)

## 8. Frontend changes needed (not included — say the word if you want these too)
- Employee/Supervisor login screen: mobile number → "Send code" → 6-digit code input →
  submit → same token/localStorage handling you already have for /login.
- Admin login screen: unchanged, plus a "Forgot password?" link → email input → check email →
  reset-password page that reads `?token=` from the URL.

## 9. One thing worth deciding later
Right now every account (including Employee/Supervisor) still requires a real email address at
registration, because the JWT is still issued with email as the subject — I kept this to avoid
touching `CustomUserDetailsService`/`JwtUtil` in the same pass as everything else. If a lot of
your rural employees genuinely have no email, the next step would be making email optional for
non-Admin roles and switching JWT subject resolution to fall back to mobile. Happy to do that
as a follow-up once this is tested and working.
