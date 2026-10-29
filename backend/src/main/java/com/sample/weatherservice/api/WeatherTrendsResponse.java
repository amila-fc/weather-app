package com.sample.weatherservice.api;

import java.time.Instant;
import java.util.List;

/**
 * Payload of {@code GET /api/weather/trends}.
 *
 * @param latitude         requested latitude
 * @param longitude        requested longitude
 * @param generatedAt      the hour the series ends on, UTC
 * @param mock             true when the series is synthetic (see {@code weather.trends.mock})
 * @param hours            number of hourly entries returned
 * @param utcOffsetMinutes offset used to display times for this location
 * @param current          the most recent hour
 * @param hourly           ascending by time, ending at {@code generatedAt}
 * @param sunrise          UTC instant, null when the sun does not rise that day
 * @param sunset           UTC instant, null when the sun does not set that day
 * @param polar            null in normal latitudes, "day" or "night" inside the polar circles, so a missing
 *                         sunrise/sunset can be explained instead of looking like missing data
 */
public record WeatherTrendsResponse(
        double latitude,
        double longitude,
        Instant generatedAt,
        boolean mock,
        int hours,
        int utcOffsetMinutes,
        Current current,
        List<HourlyWeatherPoint> hourly,
        Instant sunrise,
        Instant sunset,
        String polar) {

    /**
     * The latest hour of the series in conditions form.
     */
    public record Current(
            double temperature,
            double humidity,
            double windSpeedMph,
            double windDirectionDegrees,
            double feelsLikeTemperature,
            String description) {
    }
}
