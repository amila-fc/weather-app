package com.sample.weatherservice.service;

import com.sample.weatherservice.service.SunriseSunsetCalculator.PolarState;
import com.sample.weatherservice.service.SunriseSunsetCalculator.SunTimes;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SunriseSunsetCalculatorTest {

    /** Tolerance demanded by the story: the calculator must agree with published tables within two minutes. */
    private static final long REFERENCE_TOLERANCE_MINUTES = 2;

    private final SunriseSunsetCalculator calculator =
            new SunriseSunsetCalculator(Clock.fixed(Instant.parse("2026-06-21T12:00:00Z"), ZoneOffset.UTC));

    @Test
    void newYorkSummerSolstice_matchesThePublishedTimes() {
        // given New York City (40.7128, -74.006) on 2026-06-21, published as 05:25 and 20:31 EDT
        // when
        SunTimes sunTimes = calculator.forCoordinates(40.7128, -74.006, LocalDate.of(2026, 6, 21));

        // then
        assertWithinTolerance(Instant.parse("2026-06-21T09:25:00Z"), sunTimes.sunrise());
        assertWithinTolerance(Instant.parse("2026-06-22T00:31:00Z"), sunTimes.sunset());
        assertEquals(PolarState.NONE, sunTimes.polar());
    }

    @Test
    void sanFranciscoEquinox_producesARoughlyTwelveHourDay() {
        // given
        // when
        SunTimes sunTimes = calculator.forCoordinates(37.7749, -122.4194, LocalDate.of(2026, 3, 20));

        // then refraction stretches the equinox day past twelve hours
        long dayLengthMinutes = Duration.between(sunTimes.sunrise(), sunTimes.sunset()).toMinutes();
        assertEquals(725, dayLengthMinutes, 6);
        assertEquals(-480, sunTimes.utcOffsetMinutes());
    }

    @Test
    void polarDay_returnsNoSunTimesAndSaysSo() {
        // given Tromsø inside the Arctic Circle on the June solstice
        // when
        SunTimes sunTimes = calculator.forCoordinates(69.6492, 18.9553, LocalDate.of(2026, 6, 21));

        // then
        assertNull(sunTimes.sunrise());
        assertNull(sunTimes.sunset());
        assertEquals(PolarState.POLAR_DAY, sunTimes.polar());
    }

    @Test
    void polarNight_returnsNoSunTimesAndSaysSo() {
        // given Tromsø inside the Arctic Circle on the December solstice
        // when
        SunTimes sunTimes = calculator.forCoordinates(69.6492, 18.9553, LocalDate.of(2026, 12, 21));

        // then
        assertNull(sunTimes.sunrise());
        assertNull(sunTimes.sunset());
        assertEquals(PolarState.POLAR_NIGHT, sunTimes.polar());
    }

    @Test
    void southernHemisphere_stillHasASunriseAndSunset() {
        // given Sydney in June, which is winter there
        // when
        SunTimes sunTimes = calculator.forCoordinates(-33.8688, 151.2093, LocalDate.of(2026, 6, 21));

        // then
        assertNotNull(sunTimes.sunrise());
        assertNotNull(sunTimes.sunset());
        assertEquals(PolarState.NONE, sunTimes.polar());
        assertEquals(600, sunTimes.utcOffsetMinutes());
    }

    @Test
    void easternLongitude_sunriseComesBeforeSunsetInTheUtcDay() {
        // given Tokyo
        // when
        SunTimes sunTimes = calculator.forCoordinates(35.6762, 139.6503, LocalDate.of(2026, 6, 21));

        // then
        assertTrue(sunTimes.sunrise().isBefore(sunTimes.sunset()));
    }

    @Test
    void forToday_usesTheInjectedClock() {
        // given the fixed clock sits on 2026-06-21
        // when
        SunTimes sunTimes = calculator.forToday(40.7128, -74.006);

        // then the June solstice times come back
        assertWithinTolerance(Instant.parse("2026-06-21T09:25:00Z"), sunTimes.sunrise());
    }

    @Test
    void utcOffsetMinutes_roundsTheLongitudeToWholeHours() {
        // when + then
        assertEquals(0, SunriseSunsetCalculator.utcOffsetMinutes(0.0));
        assertEquals(-480, SunriseSunsetCalculator.utcOffsetMinutes(-122.4194));
        assertEquals(60, SunriseSunsetCalculator.utcOffsetMinutes(13.4050));
        assertEquals(300, SunriseSunsetCalculator.utcOffsetMinutes(77.2090));
    }

    private static void assertWithinTolerance(Instant reference, Instant actual) {
        long differenceMinutes = Math.abs(Duration.between(reference, actual).toMinutes());
        assertTrue(differenceMinutes <= REFERENCE_TOLERANCE_MINUTES,
                () -> "expected " + reference + " but was " + actual + " (" + differenceMinutes + " min apart)");
    }
}
