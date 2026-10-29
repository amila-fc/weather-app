package com.sample.weatherservice.service;

import com.sample.weatherservice.api.TrendDirection;
import com.sample.weatherservice.config.WeatherHistoryProperties;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Classifies a temperature series with a least-squares slope, so a single spike cannot flip the trend the way
 * a naive last-minus-first delta would.
 */
@Service
public class TemperatureTrendAnalyzer {

    private final WeatherHistoryProperties properties;

    public TemperatureTrendAnalyzer(final WeatherHistoryProperties properties) {
        this.properties = properties;
    }

    public TrendResult analyze(final List<Sample> samples) {
        final List<Sample> usable = samples.stream()
                .filter(sample -> sample.temperatureFahrenheit() != null)
                .toList();
        if (usable.size() < 2) {
            return new TrendResult(TrendDirection.STABLE, 0.0);
        }

        final Instant first = usable.get(0).recordedAt();
        double sumX = 0;
        double sumY = 0;
        double sumXY = 0;
        double sumXX = 0;
        for (Sample sample : usable) {
            double x = daysBetween(first, sample.recordedAt());
            double y = sample.temperatureFahrenheit();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        double count = usable.size();
        double denominator = count * sumXX - sumX * sumX;
        if (denominator == 0.0) {
            return new TrendResult(TrendDirection.STABLE, 0.0);
        }

        double slope = (count * sumXY - sumX * sumY) / denominator;
        return new TrendResult(classify(slope), slope);
    }

    private TrendDirection classify(final double slope) {
        if (slope > properties.getTrendThreshold()) {
            return TrendDirection.UP;
        }
        if (slope < -properties.getTrendThreshold()) {
            return TrendDirection.DOWN;
        }
        return TrendDirection.STABLE;
    }

    private static double daysBetween(final Instant from, final Instant to) {
        return Duration.between(from, to).toMillis() / 86_400_000.0;
    }

    public record Sample(Instant recordedAt, Double temperatureFahrenheit) {
    }

    public record TrendResult(TrendDirection direction, double slopePerDay) {
    }
}
