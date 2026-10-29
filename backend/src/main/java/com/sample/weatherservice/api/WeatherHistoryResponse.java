package com.sample.weatherservice.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Response of {@code GET /api/weather/history}: the requested window plus the temperature trend.
 *
 * @param temperatureChange least-squares slope of the temperature series in degrees Fahrenheit per day
 */
public record WeatherHistoryResponse(BigDecimal latitude, BigDecimal longitude, int days, List<Entry> records,
                                     TrendDirection trend, double temperatureChange) {

    /**
     * One recorded weather query.
     */
    public record Entry(Instant recordedAt, Double temperature, Double humidity, Double apparentTemperature,
                        String description, String summary, WeatherSource source, boolean cached) {
    }
}
