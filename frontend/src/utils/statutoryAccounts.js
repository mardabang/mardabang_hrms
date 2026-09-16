export function normalizePfAccount(value) {
  return (value || "").trim().toUpperCase();
}

export function validateStatutoryAccounts(pfAccount, esiAccount) {
  const errors = {};
  const pf = normalizePfAccount(pfAccount);
  const esi = (esiAccount || "").trim();
  if (pf && !/^(?:[A-Z]{5}[0-9]{17}|[A-Z]{2}\/[A-Z]{3}\/[0-9]{1,7}\/[A-Z0-9]{1,3}\/[0-9]{1,7})$/.test(pf)) {
    errors.pfAccountNumber = "Enter a PF Member ID, e.g. MH/PUN/1234567/000/1234567 or MHPUN12345670001234567. This field is not for UAN.";
  }
  if (esi && !/^[0-9]{10}$/.test(esi)) {
    errors.esiAccountNumber = "ESIC insurance number must contain exactly 10 digits.";
  }
  return errors;
}
