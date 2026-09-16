package com.mardabang.hrms.attendance.service;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "app.attendance.location")
@Getter
@Setter
public class AttendanceLocationPolicy {

    /*
     * =========================================================
     * COMPANY LOCATION (defaults; can be overridden via
     * application.properties: app.attendance.location.*)
     * =========================================================
     */

    private double latitude = 16.7207732617843;
    private double longitude = 74.46127683282292;

    /*
     * Employee/supervisor must be within this radius (meters).
     */
    private double radiusMeters = 200;

    /*
     * GPS reading must be at least this accurate (meters) to
     * be trusted. Desktop/Wi-Fi based location fixes typically
     * report accuracy in the thousands of meters and will be
     * rejected by this check.
     */
    private double maxAccuracyMeters = 50;

    /*
     * Optional per-firm overrides, e.g. different branches
     * with different office coordinates/radius.
     */
    private Map<String, Site> firms = new HashMap<>();

    @Getter
    @Setter
    public static class Site {
        private Double latitude;
        private Double longitude;
        private Double radiusMeters;
    }

    /*
     * =========================================================
     * VALIDATION
     * =========================================================
     *
     * Everyone (employee or supervisor) must be physically
     * within the configured company radius, with a sufficiently
     * accurate GPS fix, to check in or check out.
     *
     * There is NO bypass here by design - if a device cannot
     * produce an accurate GPS fix (e.g. a desktop browser),
     * check-in/checkout is expected to fail. Use a phone with
     * GPS enabled instead.
     */
    public void validate(Double lat, Double lon, Double accuracy,
            String firmCode, String action) {
        validateRecorded(lat, lon, accuracy);

        Site site = firms.get(firmCode);
        double centreLat = site == null || site.latitude == null ? latitude : site.latitude;
        double centreLon = site == null || site.longitude == null ? longitude : site.longitude;
        double radius = site == null || site.radiusMeters == null ? radiusMeters : site.radiusMeters;

        if (!Double.isFinite(centreLat) || centreLat < -90 || centreLat > 90
                || !Double.isFinite(centreLon) || centreLon < -180 || centreLon > 180
                || !Double.isFinite(radius) || radius <= 0
                || !Double.isFinite(maxAccuracyMeters) || maxAccuracyMeters <= 0) {
            throw new IllegalStateException("Company location configuration is invalid. Contact your administrator.");
        }

        if (accuracy > maxAccuracyMeters) {
            throw new IllegalArgumentException(String.format(Locale.US,
                    "Location accuracy is %.0f metres; required accuracy is %.0f metres or better. Please use a device with GPS (e.g. a phone) and try again outdoors.",
                    accuracy, maxAccuracyMeters));
        }

        double distance = distanceMeters(centreLat, centreLon, lat, lon);

        if (distance > radius) {
            throw new IllegalArgumentException(String.format(Locale.US,
                    "You are outside the allowed company location for %s. Distance: %.2f metres. Allowed radius: %.0f metres.",
                    action, distance, radius));
        }
    }

    /**
     * Validates location evidence recorded by an administrator or supervisor.
     * The coordinates are retained for audit, but accuracy and office distance
     * do not block the attendance action.
     */
    public void validateRecorded(Double lat, Double lon, Double accuracy) {
        if (lat == null || lon == null || !Double.isFinite(lat) || !Double.isFinite(lon)
                || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            throw new IllegalArgumentException("Valid latitude and longitude are required.");
        }
        if (accuracy == null || !Double.isFinite(accuracy) || accuracy < 0) {
            throw new IllegalArgumentException("Valid non-negative location accuracy is required.");
        }
    }

    static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.pow(Math.sin(dLon / 2), 2);
        a = Math.max(0, Math.min(1, a));
        return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
