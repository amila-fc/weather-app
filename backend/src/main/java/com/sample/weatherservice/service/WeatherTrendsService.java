package com.sample.weatherservice.service;

import com.sample.weatherservice.api.HourlyWeatherPoint;
import com.sample.weatherservice.api.WeatherTrendsResponse;
import com.sample.weatherservice.config.WeatherTrendsProperties;
import com.sample.weatherservice.service.SunriseSunsetCalculator.PolarState;
import com.sample.weatherservice.service.SunriseSunsetCalculator.SunTimes;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds the trends dashboard series.
 *
 * <p>While {@code weather.trends.mock} is true the series is generated from a deterministic model: a diurnal
 * sine keyed on the location's clock plus a slow offset derived from a hash of the coordinates. The same
 * coordinates and the same hour therefore always produce the same payload, and the response says
 * {@code mock: true} so nobody mistakes it for observed data. Nothing is written to {@code weather_history}.
 */
@Service
public class WeatherTrendsService {

    private static final String[] DESCRIPTIONS = {
            "Clear sky", "Mainly clear", "Partly cloudy", "Overcast", "Light rain"};

    private static final double NEUTRAL_TEMPERATURE_F = 84.0;
    private static final double LATITUDE_COOLING_F = 44.0;
    private static final double PEAK_HOUR = 15.0;
    private static final double MIN_HUMIDITY = 20.0;
    private static final double MAX_HUMIDITY = 99.0;
    private static final double MIN_WIND_MPH = 0.0;
    private static final double COORDINATE_SCALE = 10_000.0;
    private static final long SEED_MASK = 0x7fff_ffffL;

    private final WeatherTrendsProperties properties;
    private final SunriseSunsetCalculator sunriseSunsetCalculator;
    private final Clock clock;

    public WeatherTrendsService(final WeatherTrendsProperties properties,
                                final SunriseSunsetCalculator sunriseSunsetCalculator,
                                final Clock clock) {
        this.properties = properties;
        this.sunriseSunsetCalculator = sunriseSunsetCalculator;
        this.clock = clock;
    }

    /**
     * @param hours number of hourly entries; the caller validates it against the configured bounds
     */
    public WeatherTrendsResponse getTrends(final double latitude, final double longitude, final int hours) {
        final Instant end = Instant.now(clock).truncatedTo(ChronoUnit.HOURS);
        final int utcOffsetMinutes = SunriseSunsetCalculator.utcOffsetMinutes(longitude);
        final SunTimes sunTimes = sunriseSunsetCalculator.forCoordinates(latitude, longitude,
                localDate(end, utcOffsetMinutes));
        final long seed = seed(latitude, longitude);

        final List<HourlyWeatherPoint> hourly = new ArrayList<>(hours);
        for (int index = hours - 1; index >= 0; index--) {
            hourly.add(point(end.minus(index, ChronoUnit.HOURS), latitude, seed, utcOffsetMinutes));
        }

        final HourlyWeatherPoint latest = hourly.get(hourly.size() - 1);
        final WeatherTrendsResponse.Current current = new WeatherTrendsResponse.Current(
                latest.temperature(),
                latest.humidity(),
                latest.windSpeedMph(),
                latest.windDirectionDegrees(),
                latest.feelsLikeTemperature(),
                DESCRIPTIONS[(int) (seed % DESCRIPTIONS.length)]);

        return new WeatherTrendsResponse(latitude, longitude, end, properties.isMock(), hours, utcOffsetMinutes,
                current, hourly, sunTimes.sunrise(), sunTimes.sunset(), polarLabel(sunTimes.polar()));
    }

    private static HourlyWeatherPoint point(final Instant time, final double latitude, final long seed,
                                            final int utcOffsetMinutes) {
        final double localHour = localHour(time, utcOffsetMinutes);
        final double seasonalMean = NEUTRAL_TEMPERATURE_F - LATITUDE_COOLING_F * Math.abs(latitude) / 90.0
                + seed % 5 - 2.0;
        final double amplitude = 7.0 + seed % 3;
        final double temperature = seasonalMean
                + amplitude * Math.cos(2.0 * Math.PI * (localHour - PEAK_HOUR) / 24.0);
        final double humidity = clamp(88.0 - 1.4 * (temperature - seasonalMean) + (seed % 7) * 0.5,
                MIN_HUMIDITY, MAX_HUMIDITY);
        final double windSpeedMph = Math.max(MIN_WIND_MPH,
                4.0 + (seed % 11) / 2.0 + 2.0 * Math.sin(2.0 * Math.PI * localHour / 24.0));
        final double windDirectionDegrees = ((seed % 360) + localHour * 6.0) % 360.0;
        final double feelsLike = FeelsLikeCalculator.feelsLike(null, temperature, humidity, windSpeedMph);

        return new HourlyWeatherPoint(time, round1(temperature), round1(humidity), round1(windSpeedMph),
                round1(windDirectionDegrees), round1(feelsLike));
    }

    private static double localHour(final Instant time, final int utcOffsetMinutes) {
        final OffsetDateTime local = time.atOffset(ZoneOffset.ofTotalSeconds(utcOffsetMinutes * 60));
        return local.getHour() + local.getMinute() / 60.0;
    }

    private static LocalDate localDate(final Instant instant, final int utcOffsetMinutes) {
        return instant.atOffset(ZoneOffset.ofTotalSeconds(utcOffsetMinutes * 60)).toLocalDate();
    }

    private static long seed(final double latitude, final double longitude) {
        long key = Math.round(latitude * COORDINATE_SCALE) * 31L + Math.round(longitude * COORDINATE_SCALE);
        return key & SEED_MASK;
    }

    private static double clamp(final double value, final double min, final double max) {
        return Math.min(max, Math.max(min, value));
    }

    private static double round1(final double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static String polarLabel(final PolarState polar) {
        return switch (polar) {
            case NONE -> null;
            case POLAR_DAY -> "day";
            case POLAR_NIGHT -> "night";
        };
    }
}
