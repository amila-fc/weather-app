package com.sample.weatherservice.service;

import com.sample.weatherservice.api.HourlyWeatherPoint;
import com.sample.weatherservice.api.WeatherTrendsResponse;
import com.sample.weatherservice.config.WeatherTrendsProperties;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeatherTrendsServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T00:37:12Z");
    private static final double SAN_FRANCISCO_LAT = 37.7749;
    private static final double SAN_FRANCISCO_LNG = -122.4194;

    private final WeatherTrendsProperties properties = new WeatherTrendsProperties();
    private final WeatherTrendsService service = serviceWith(properties, NOW);

    private static WeatherTrendsService serviceAt(Instant now) {
        return serviceWith(new WeatherTrendsProperties(), now);
    }

    private static WeatherTrendsService serviceWith(WeatherTrendsProperties properties, Instant now) {
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        return new WeatherTrendsService(properties, new SunriseSunsetCalculator(clock), clock);
    }

    @Test
    void returnsTheRequestedNumberOfAscendingHourlyPointsEndingAtTheCurrentHour() {
        // given
        int hours = 24;

        // when
        WeatherTrendsResponse trends = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, hours);

        // then
        List<HourlyWeatherPoint> hourly = trends.hourly();
        assertEquals(hours, hourly.size());
        assertEquals(24, trends.hours());
        assertEquals(Instant.parse("2026-10-30T00:00:00Z"), trends.generatedAt());
        assertEquals(trends.generatedAt(), hourly.get(hourly.size() - 1).time());
        assertEquals(Instant.parse("2026-10-29T01:00:00Z"), hourly.get(0).time());
        for (int index = 1; index < hourly.size(); index++) {
            assertTrue(hourly.get(index - 1).time().isBefore(hourly.get(index).time()));
        }
    }

    @Test
    void isDeterministicForTheSameCoordinatesAndHour() {
        // when
        WeatherTrendsResponse first = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 24);
        WeatherTrendsResponse second = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 24);

        // then
        assertEquals(first, second);
    }

    @Test
    void differentCoordinatesProduceDifferentSeries() {
        // when
        WeatherTrendsResponse city = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 24);
        WeatherTrendsResponse otherCity = service.getTrends(40.7128, -74.0060, 24);

        // then
        assertNotEquals(city.hourly(), otherCity.hourly());
    }

    @Test
    void flagsSyntheticDataAndHonoursTheConfigurationSwitch() {
        // given
        properties.setMock(false);

        // when
        WeatherTrendsResponse trends = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 2);

        // then
        assertFalse(trends.mock());

        properties.setMock(true);
        assertTrue(service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 2).mock());
    }

    @Test
    void everyPointCarriesTheDashboardFields() {
        // when
        WeatherTrendsResponse trends = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 6);

        // then
        trends.hourly().forEach(point -> {
            assertTrue(point.temperature() > -60 && point.temperature() < 140, "temperature " + point.temperature());
            assertTrue(point.humidity() >= 20 && point.humidity() <= 99, "humidity " + point.humidity());
            assertTrue(point.windSpeedMph() >= 0, "wind " + point.windSpeedMph());
            assertTrue(point.windDirectionDegrees() >= 0 && point.windDirectionDegrees() < 360,
                    "direction " + point.windDirectionDegrees());
            assertTrue(Math.abs(point.feelsLikeTemperature() - point.temperature()) < 40,
                    "feels like " + point.feelsLikeTemperature());
        });
    }

    @Test
    void currentConditionsMirrorTheLastHour() {
        // when
        WeatherTrendsResponse trends = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 3);

        // then
        HourlyWeatherPoint latest = trends.hourly().get(2);
        assertEquals(latest.temperature(), trends.current().temperature());
        assertEquals(latest.humidity(), trends.current().humidity());
        assertEquals(latest.windSpeedMph(), trends.current().windSpeedMph());
        assertEquals(latest.windDirectionDegrees(), trends.current().windDirectionDegrees());
        assertEquals(latest.feelsLikeTemperature(), trends.current().feelsLikeTemperature());
        assertTrue(trends.current().description() != null && !trends.current().description().isBlank());
    }

    @Test
    void reportsTheSunTimesAndTheLocationOffset() {
        // when
        WeatherTrendsResponse trends = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 2);

        // then
        assertEquals(-480, trends.utcOffsetMinutes());
        assertTrue(trends.sunrise() != null && trends.sunset() != null);
        assertNull(trends.polar());
        assertEquals(SAN_FRANCISCO_LAT, trends.latitude());
        assertEquals(SAN_FRANCISCO_LNG, trends.longitude());
    }

    @Test
    void polarDayIsReportedInsteadOfMissingSunTimes() {
        // given Tromsø during the June solstice
        WeatherTrendsService midsummerService = serviceAt(Instant.parse("2026-06-21T12:00:00Z"));

        // when
        WeatherTrendsResponse trends = midsummerService.getTrends(69.6492, 18.9553, 2);

        // then
        assertEquals("day", trends.polar());
        assertNull(trends.sunset());
    }

    @Test
    void polarNightIsReportedInsteadOfMissingSunTimes() {
        // given Tromsø during the December solstice
        WeatherTrendsService midwinterService = serviceAt(Instant.parse("2026-12-21T12:00:00Z"));

        // when
        WeatherTrendsResponse trends = midwinterService.getTrends(69.6492, 18.9553, 2);

        // then
        assertEquals("night", trends.polar());
        assertNull(trends.sunrise());
    }

    @Test
    void supportsTheSmallestAndLargestWindows() {
        // when
        WeatherTrendsResponse smallest = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 1);
        WeatherTrendsResponse largest = service.getTrends(SAN_FRANCISCO_LAT, SAN_FRANCISCO_LNG, 48);

        // then
        assertEquals(1, smallest.hourly().size());
        assertEquals(48, largest.hourly().size());
    }
}
