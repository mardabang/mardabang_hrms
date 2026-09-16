package com.mardabang.hrms.employee.service;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import java.util.Locale;
final class StatutoryAccountValidator {
    private StatutoryAccountValidator() {}
    static void validate(EmployeeDto dto) {
        if (dto == null) return;
        String pf = dto.getPfAccountNumber() == null ? "" : dto.getPfAccountNumber().trim().toUpperCase(Locale.ROOT);
        String esi = dto.getEsiAccountNumber() == null ? "" : dto.getEsiAccountNumber().trim();
        if (!pf.isEmpty() && !pf.matches("(?:[A-Z]{5}[0-9]{17}|[A-Z]{2}/[A-Z]{3}/[0-9]{1,7}/[A-Z0-9]{1,3}/[0-9]{1,7})")) {
            throw new IllegalArgumentException("Enter a valid PF Member ID, such as MH/PUN/1234567/000/1234567. This field is not for UAN.");
        }
        if (!esi.isEmpty() && !esi.matches("[0-9]{10}")) {
            throw new IllegalArgumentException("ESIC insurance number must contain exactly 10 digits.");
        }
        if (dto.getPfAccountNumber() != null) dto.setPfAccountNumber(pf);
        if (dto.getEsiAccountNumber() != null) dto.setEsiAccountNumber(esi);
    }
}
