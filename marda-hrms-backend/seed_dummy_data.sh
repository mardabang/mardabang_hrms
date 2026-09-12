#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:8080/api"
ADMIN_EMAIL="admin@mardabang.com"
ADMIN_PASSWORD="admin123"
EMPLOYEE_CODE="MB-EMP-101"
FIRM_CODE="MBIPL"
MONTH="2026-08"

for command in curl jq python3; do
  command -v "$command" >/dev/null || {
    echo "Required command missing: $command"
    exit 1
  }
done

read -rsp "Admin password: " ADMIN_PASSWORD
echo

echo "Logging in..."
LOGIN_JSON=$(jq -n \
  --arg email "$ADMIN_EMAIL" \
  --arg password "$ADMIN_PASSWORD" \
  '{email: $email, password: $password}')

LOGIN_RESPONSE=$(curl --fail-with-body -sS \
  -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  --data-binary "$LOGIN_JSON")

unset ADMIN_PASSWORD LOGIN_JSON

TOKEN=$(jq -er '.token | select(length > 0)' <<< "$LOGIN_RESPONSE")

api() {
  curl --fail-with-body -sS \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "Fetching employee..."
EMP_JSON=$(api "$BASE_URL/employees/code/$EMPLOYEE_CODE")
EMP_NAME=$(jq -er '.name' <<< "$EMP_JSON")
DEPARTMENT=$(jq -r '.department // ""' <<< "$EMP_JSON")

echo "Found: $EMP_NAME ($DEPARTMENT)"

# Generate August dates and weekdays without platform-specific date commands.
DATES=$(python3 - "$MONTH" <<'PY'
import calendar
import datetime
import sys

year, month = map(int, sys.argv[1].split("-"))
for day in range(1, calendar.monthrange(year, month)[1] + 1):
    date = datetime.date(year, month, day)
    print(date.isoformat(), date.isoweekday())
PY
)

echo "Marking attendance for August 2026..."

while read -r DATE DOW; do
  DAY="${DATE##*-}"
  CHECKIN="null"
  CHECKOUT="null"

  if [[ "$DOW" == "7" ]]; then
    STATUS="WEEKLY_OFF"
  elif [[ "$DAY" == "10" ]]; then
    STATUS="ABSENT"
  elif [[ "$DAY" == "15" ]]; then
    STATUS="LATE"
    CHECKIN='"10:15:00"'
    CHECKOUT='"18:00:00"'
  else
    STATUS="COMPLETED"
    CHECKIN='"09:00:00"'
    CHECKOUT='"18:00:00"'
  fi

  PAYLOAD=$(jq -n \
    --arg firm "$FIRM_CODE" \
    --arg code "$EMPLOYEE_CODE" \
    --arg name "$EMP_NAME" \
    --arg department "$DEPARTMENT" \
    --arg date "$DATE" \
    --arg status "$STATUS" \
    --arg recordedBy "$ADMIN_EMAIL" \
    --argjson checkIn "$CHECKIN" \
    --argjson checkOut "$CHECKOUT" \
    '{
      firmCode: $firm,
      employeeCode: $code,
      employeeName: $name,
      department: $department,
      team: $department,
      shift: "EIGHT_HOURS",
      attendanceDate: $date,
      checkInTime: $checkIn,
      checkOutTime: $checkOut,
      overtime: 0,
      status: $status,
      recordedBy: $recordedBy,
      notes: "August 2026 seed data"
    }')

  RESPONSE=$(api -X POST "$BASE_URL/attendance/manual" \
    --data-binary "$PAYLOAD")

  echo "  $DATE -> $STATUS"
done <<< "$DATES"

echo "Generating salary for $MONTH..."
api -X POST \
  "$BASE_URL/payroll/generate?employeeCode=$EMPLOYEE_CODE&firmCode=$FIRM_CODE&month=$MONTH"
echo

echo "Issuing a test advance..."
CREDIT_PAYLOAD=$(jq -n \
  --arg code "$EMPLOYEE_CODE" \
  --arg firm "$FIRM_CODE" \
  '{
    employeeCode: $code,
    firmCode: $firm,
    type: "ADVANCE",
    principalAmount: 5000,
    emiAmount: 1000,
    reason: "Test advance for August 2026 Reports testing"
  }')

CREDIT_JSON=$(api -X POST "$BASE_URL/payroll/credits" \
  --data-binary "$CREDIT_PAYLOAD")
echo "$CREDIT_JSON" | jq .

CREDIT_ID=$(jq -er '.id' <<< "$CREDIT_JSON")

echo "Recording a ₹2,000 repayment..."
api -X POST "$BASE_URL/payroll/credits/$CREDIT_ID/repay" \
  --data-binary '{"amount":2000,"notes":"Test manual repayment"}'
echo

echo "Done. Select August 2026 in Reports."