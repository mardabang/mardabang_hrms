package com.mardabang.hrms.employee.service;
import com.mardabang.hrms.employee.dto.EmployeeDto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class StatutoryAccountValidatorTest {
    @Test void optionalValuesAndPartialUpdatesWork() {
        EmployeeDto dto = new EmployeeDto();assertDoesNotThrow(() -> StatutoryAccountValidator.validate(dto));
        assertNull(dto.getPfAccountNumber());assertNull(dto.getEsiAccountNumber());
    }
    @Test void acceptsAndNormalizesMemberIdsAndInsuranceNumbers() {
        for (String pf : new String[]{"MHPUN12345670001234567", "MH/PUN/1234567/000/1234567", " mh/pun/123/0/456 "}) {
            EmployeeDto dto = new EmployeeDto();dto.setPfAccountNumber(pf);dto.setEsiAccountNumber("0123456789");
            assertDoesNotThrow(() -> StatutoryAccountValidator.validate(dto));
            assertEquals(pf.trim().toUpperCase(), dto.getPfAccountNumber());
        }
    }
    @Test void rejectsMalformedPfAndUan() {
        for (String pf : new String[]{"123456789012", "MH/PUN/12345678/000/123", "MH/PUN/123/000/abc"}) {
            EmployeeDto dto = new EmployeeDto();dto.setPfAccountNumber(pf);
            assertThrows(IllegalArgumentException.class, () -> StatutoryAccountValidator.validate(dto));
        }
    }
    @Test void rejectsInvalidInsuranceNumbers() {
        for (String esi : new String[]{"123456789", "12345678901", "12345ABCDE"}) {
            EmployeeDto dto = new EmployeeDto();dto.setEsiAccountNumber(esi);
            assertThrows(IllegalArgumentException.class, () -> StatutoryAccountValidator.validate(dto));
        }
    }
}
