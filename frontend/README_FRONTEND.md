# Frontend auth files — integration notes

## 1. Files and where they go
- `AuthContext.js` → replace your existing `src/context/AuthContext.js`
- `Login.jsx` → replace your existing Login page (same folder as before)
- `ForgotPassword.jsx` → new file, same folder as `Login.jsx`
- `ResetPassword.jsx` → new file, same folder as `Login.jsx`

## 2. Add two routes to your router (App.js / routes file — wherever `/login` is currently defined)
```jsx
import ForgotPassword from "./pages/ForgotPassword"; // adjust path to match your project
import ResetPassword from "./pages/ResetPassword";

<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```
Both must be **public** routes (outside whatever wrapper redirects unauthenticated users to `/login`), same as your existing `/login` route.

## 3. Backend property to update
`app.reset-password.base-url` in `application.properties` needs to point at your real frontend URL + the `/reset-password` route, e.g.:
```properties
app.reset-password.base-url=http://your-domain-or-ip:port/reset-password
```
This is the link that goes out in the reset email — if it's wrong, the email will send but the link won't open your app.

## 4. New CSS classes used (add to your auth stylesheet)
The new UI reuses all your existing `auth-*` classes (`auth-page`, `auth-card`, `auth-form`, `form-group`, `auth-button`, `auth-error`, `auth-footer`) untouched. A few new ones were added for the OTP tabs — if you don't already have equivalents, add something like:

```css
.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.auth-tabs button {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
}
.auth-tabs button.active {
  background: var(--primary, #2b6cb0);
  color: #fff;
  border-color: transparent;
}
.auth-message {
  background: #eef7ee;
  color: #256029;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 0.9rem;
}
.auth-otp-target {
  font-size: 0.9rem;
  margin-bottom: 12px;
}
.auth-link-button {
  background: none;
  border: none;
  color: var(--primary, #2b6cb0);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-size: 0.85rem;
}
.auth-resend {
  display: block;
  margin: 10px auto 0;
}
```
Feel free to restyle these to match your actual theme — they're functional defaults, not final design.

## 5. What the Login page now does
- **Admin Login tab** — unchanged email + password, plus a new "Forgot password?" link.
- **Employee / Supervisor Login tab** — enter mobile → "Send Code" → enter 6-digit code → "Verify & Login". Includes a 60-second resend cooldown and a "Change number" option if they mistyped.
- Both tabs route to the correct dashboard afterward using the same role-based logic your app already had (Admin → `/dashboard`, Employee → `/employee/dashboard`, Supervisor → `/supervisor-dashboard`).

## 6. Quick test checklist
1. Admin: log in normally with the password tab — should be unaffected.
2. Admin: `/forgot-password` → enter admin email → check inbox for the reset link → open it → set new password → log in with the new one.
3. Employee/Supervisor: switch to the OTP tab → enter their registered mobile → check SMS arrives → enter code → should land on the right dashboard.
4. Try a wrong code or an expired code — should show a clear error, not a crash.
