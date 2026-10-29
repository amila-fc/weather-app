package com.sample.weatherservice.api;

import java.time.Instant;

/**
 * One hour of the trends series.
 *
 * @param time                  start of the hour, UTC
 * @param temperature           °F
 * @param humidity              percent
 * @param windSpeedMph          mph
 * @param windDirectionDegrees  direction the wind blows from, clockwise from north
 * @param feelsLikeTemperature  °F, see {@code FeelsLikeCalculator}
 */
public record HourlyWeatherPoint(
        Instant time,
        double temperature,
        double humidity,
        double windSpeedMph,
        double windDirectionDegrees,
        double feelsLikeTemperature) {
}
