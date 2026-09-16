package com.mardabang.hrms.attendance.service;

public enum AttendanceVerification {
    EMPLOYEE_GPS(true),
    SUPERVISOR_RECORDED(false),
    ADMIN_RECORDED(false);

    private final boolean geofenceRequired;

    AttendanceVerification(boolean geofenceRequired) {
        this.geofenceRequired = geofenceRequired;
    }

    public boolean requiresGeofence() {
        return geofenceRequired;
    }
}
