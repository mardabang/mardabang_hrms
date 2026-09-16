package com.mardabang.hrms.attendance.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AttendanceLocationPolicyTest {
    private final AttendanceLocationPolicy policy = new AttendanceLocationPolicy();
    @Test void acceptsSuppliedIndoorPoint() {
        assertDoesNotThrow(() -> policy.validate(16.721666815274723, 74.46121491533951, 50.0, "TEST", "check-in"));
        assertEquals(152.24, AttendanceLocationPolicy.distanceMeters(16.72032809060519, 74.46151456730551, 16.721666815274723, 74.46121491533951), 0.1);
    }
    @Test void rejectsCoarseOrMissingAccuracy() {
        for (Double accuracy : new Double[] {null, -1.0, Double.NaN, Double.POSITIVE_INFINITY, 50000.0, 50.01}) {
            assertThrows(IllegalArgumentException.class, () -> policy.validate(policy.getLatitude(), policy.getLongitude(), accuracy, "TEST", "check-in"));
        }
        assertDoesNotThrow(() -> policy.validate(policy.getLatitude(), policy.getLongitude(), 0.0, "TEST", "check-in"));
    }
    @Test void rejectsInvalidCoordinates() {
        for (Double lat : new Double[] {null, Double.NaN, Double.POSITIVE_INFINITY, 91.0, -91.0}) {
            assertThrows(IllegalArgumentException.class, () -> policy.validate(lat, policy.getLongitude(), 10.0, "TEST", "check-in"));
        }
        assertThrows(IllegalArgumentException.class, () -> policy.validate(16.72, Double.NaN, 10.0, "TEST", "check-in"));
    }
    @Test void rejectsOutsideCompany() {
        assertThrows(IllegalArgumentException.class, () -> policy.validate(16.77, 74.46, 10.0, "TEST", "check-out"));
    }
    @Test void recordedSupervisorLocationAllowsCoarseAccuracyAndOutsideCoordinates() {
        assertDoesNotThrow(() -> policy.validateRecorded(16.77, 74.46, 50000.0));
    }
    @Test void recordedSupervisorLocationStillRequiresValidEvidence() {
        assertThrows(IllegalArgumentException.class, () -> policy.validateRecorded(null, 74.46, 10.0));
        assertDoesNotThrow(() -> policy.validateRecorded(16.72, 74.46, 0.0));
        assertThrows(IllegalArgumentException.class, () -> policy.validateRecorded(16.72, 74.46, -1.0));
    }
    @Test void usesFirmSpecificLocation() {
        AttendanceLocationPolicy.Site site = new AttendanceLocationPolicy.Site();
        site.setLatitude(19.0); site.setLongitude(73.0); site.setRadiusMeters(100.0);
        policy.getFirms().put("OTHER", site);
        assertDoesNotThrow(() -> policy.validate(19.0, 73.0, 10.0, "OTHER", "check-in"));
        assertThrows(IllegalArgumentException.class, () -> policy.validate(policy.getLatitude(), policy.getLongitude(), 10.0, "OTHER", "check-in"));
    }
    @Test void invalidConfigurationFailsClosed() {
        policy.setRadiusMeters(Double.NaN);
        assertThrows(IllegalStateException.class, () -> policy.validate(16.72, 74.46, 10.0, "TEST", "check-in"));
    }
}
