package com.sample.weatherservice.service;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Sunrise and sunset from the NOAA solar-position equations — plain double maths, no dependency and no
 * external API. Polynomial accuracy is about a minute for the latitudes where the sun actually rises.
 */
@Component
public class SunriseSunsetCalculator {

    /** Official zenith: 90° plus 34' of refraction and 16' of solar semi-diameter. */
    private static final double OFFICIAL_ZENITH_DEGREES = 90.833;

    private static final double MINUTES_PER_DAY = 1440.0;
    private static final double MINUTES_PER_HALF_DAY = MINUTES_PER_DAY / 2.0;
    private static final double DEGREES_PER_HOUR = 15.0;

    private final Clock clock;

    public SunriseSunsetCalculator(final Clock clock) {
        this.clock = clock;
    }

    /**
     * @return today's sun times for the location's own date, in UTC
     */
    public SunTimes forToday(final double latitude, final double longitude) {
        final int utcOffsetMinutes = utcOffsetMinutes(longitude);
        final LocalDate date = Instant.now(clock)
                .atOffset(ZoneOffset.ofTotalSeconds(utcOffsetMinutes * 60))
                .toLocalDate();
        return forCoordinates(latitude, longitude, date);
    }

    public SunTimes forCoordinates(final double latitude, final double longitude, final LocalDate date) {
        final int utcOffsetMinutes = utcOffsetMinutes(longitude);
        final double fractionalYear = 2.0 * Math.PI / 365.0 * (date.getDayOfYear() - 1 + 0.5);

        final double equationOfTimeMinutes = 229.18
                * (0.000075
                + 0.001868 * Math.cos(fractionalYear)
                - 0.032077 * Math.sin(fractionalYear)
                - 0.014615 * Math.cos(2.0 * fractionalYear)
                - 0.040849 * Math.sin(2.0 * fractionalYear));

        final double declinationRadians = 0.006918
                - 0.399912 * Math.cos(fractionalYear)
                + 0.070257 * Math.sin(fractionalYear)
                - 0.006758 * Math.cos(2.0 * fractionalYear)
                + 0.000907 * Math.sin(2.0 * fractionalYear)
                - 0.002697 * Math.cos(3.0 * fractionalYear)
                + 0.00148 * Math.sin(3.0 * fractionalYear);

        final double latitudeRadians = Math.toRadians(latitude);
        final double cosHourAngle = Math.cos(Math.toRadians(OFFICIAL_ZENITH_DEGREES))
                / (Math.cos(latitudeRadians) * Math.cos(declinationRadians))
                - Math.tan(latitudeRadians) * Math.tan(declinationRadians);

        // Outside [-1, 1] the sun never crosses the horizon that day: polar day or polar night.
        if (cosHourAngle < -1.0) {
            return new SunTimes(null, null, utcOffsetMinutes, PolarState.POLAR_DAY);
        }
        if (cosHourAngle > 1.0) {
            return new SunTimes(null, null, utcOffsetMinutes, PolarState.POLAR_NIGHT);
        }

        final double hourAngleDegrees = Math.toDegrees(Math.acos(cosHourAngle));
        // Solar noon in UTC minutes; longitude is positive east, so the western hemisphere shifts it later.
        final double solarNoonMinutes = MINUTES_PER_HALF_DAY - 4.0 * longitude - equationOfTimeMinutes;

        return new SunTimes(
                toInstant(date, solarNoonMinutes - 4.0 * hourAngleDegrees),
                toInstant(date, solarNoonMinutes + 4.0 * hourAngleDegrees),
                utcOffsetMinutes,
                PolarState.NONE);
    }

    /**
     * Whole-hour offset implied by the longitude. The JDK has no coordinate-to-time-zone lookup, so this is
     * the best civil-time approximation available without a tz database; the sun times themselves are exact.
     */
    static int utcOffsetMinutes(final double longitude) {
        return (int) Math.round(longitude / DEGREES_PER_HOUR) * 60;
    }

    private static Instant toInstant(final LocalDate date, final double minutesFromMidnightUtc) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant().plusMillis(Math.round(minutesFromMidnightUtc * 60_000.0));
    }

    public enum PolarState {
        NONE,
        POLAR_DAY,
        POLAR_NIGHT
    }

    /**
     * @param sunrise          UTC instant, or null when the sun does not cross the horizon that day
     * @param sunset           UTC instant, or null when the sun does not cross the horizon that day
     * @param utcOffsetMinutes offset the location's clock is displayed with
     * @param polar            which polar case applies, so the UI can explain a missing time
     */
    public record SunTimes(Instant sunrise, Instant sunset, int utcOffsetMinutes, PolarState polar) {
    }
}
