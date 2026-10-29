package com.sample.weatherservice.service;

import com.sample.weatherservice.api.TrendDirection;
import com.sample.weatherservice.config.WeatherHistoryProperties;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TemperatureTrendAnalyzerTest {

    private static final Instant FIRST_DAY = Instant.parse("2026-10-20T00:00:00Z");

    private final WeatherHistoryProperties properties = new WeatherHistoryProperties();
    private final TemperatureTrendAnalyzer analyzer = new TemperatureTrendAnalyzer(properties);

    @Test
    void analyze_risingSeries_returnsUpWithSlopeInDegreesPerDay() {
        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(daily(50.0, 55.0, 60.0, 65.0));

        // then
        assertEquals(TrendDirection.UP, result.direction());
        assertEquals(5.0, result.slopePerDay(), 0.0001);
    }

    @Test
    void analyze_fallingSeries_returnsDown() {
        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(daily(70.0, 60.0, 50.0));

        // then
        assertEquals(TrendDirection.DOWN, result.direction());
        assertEquals(-10.0, result.slopePerDay(), 0.0001);
    }

    @Test
    void analyze_flatSeries_returnsStableWithZeroSlope() {
        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(daily(50.0, 50.0, 50.0));

        // then
        assertEquals(TrendDirection.STABLE, result.direction());
        assertEquals(0.0, result.slopePerDay(), 0.0001);
    }

    @Test
    void analyze_noisySeriesWithinThreshold_returnsStable() {
        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(daily(50.0, 50.6, 50.2));

        // then
        assertEquals(TrendDirection.STABLE, result.direction());
        assertEquals(0.1, result.slopePerDay(), 0.0001);
    }

    @Test
    void analyze_noSamples_returnsStableAndZero() {
        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(List.of());

        // then
        assertEquals(TrendDirection.STABLE, result.direction());
        assertEquals(0.0, result.slopePerDay());
    }

    @Test
    void analyze_singleSample_returnsStableAndZero() {
        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(daily(42.0));

        // then
        assertEquals(TrendDirection.STABLE, result.direction());
        assertEquals(0.0, result.slopePerDay());
    }

    @Test
    void analyze_zeroVarianceTimestamps_returnsStable() {
        // given
        List<TemperatureTrendAnalyzer.Sample> samples = List.of(
                new TemperatureTrendAnalyzer.Sample(FIRST_DAY, 40.0),
                new TemperatureTrendAnalyzer.Sample(FIRST_DAY, 70.0));

        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(samples);

        // then
        assertEquals(TrendDirection.STABLE, result.direction());
        assertEquals(0.0, result.slopePerDay());
    }

    @Test
    void analyze_usesTheLeastSquaresSlopeNotTheEndpoints() {
        // given: 51.0 - 50.0 = +1 across the endpoints, but a single spike drags the true slope down
        List<TemperatureTrendAnalyzer.Sample> samples = daily(50.0, 70.0, 49.0, 51.0);

        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(samples);

        // then
        assertEquals(TrendDirection.DOWN, result.direction());
        assertEquals(-1.8, result.slopePerDay(), 0.0001);
    }

    @Test
    void analyze_raisingTheThreshold_reclassifiesWithoutCodeChanges() {
        // given
        properties.setTrendThreshold(10.0);

        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(daily(50.0, 55.0, 60.0, 65.0));

        // then
        assertEquals(TrendDirection.STABLE, result.direction());
    }

    @Test
    void analyze_ignoresSamplesWithoutATemperature() {
        // given
        List<TemperatureTrendAnalyzer.Sample> samples = List.of(
                new TemperatureTrendAnalyzer.Sample(FIRST_DAY, null),
                new TemperatureTrendAnalyzer.Sample(FIRST_DAY.plus(Duration.ofDays(1)), 50.0),
                new TemperatureTrendAnalyzer.Sample(FIRST_DAY.plus(Duration.ofDays(2)), 60.0));

        // when
        TemperatureTrendAnalyzer.TrendResult result = analyzer.analyze(samples);

        // then
        assertEquals(TrendDirection.UP, result.direction());
        assertTrue(result.slopePerDay() > 0);
    }

    private static List<TemperatureTrendAnalyzer.Sample> daily(double... temperatures) {
        List<TemperatureTrendAnalyzer.Sample> samples = new ArrayList<>();
        for (int day = 0; day < temperatures.length; day++) {
            samples.add(new TemperatureTrendAnalyzer.Sample(FIRST_DAY.plus(Duration.ofDays(day)), temperatures[day]));
        }
        return samples;
    }

    @Test
    void trendDirection_wireValues_areLowercase() {
        // when + then
        assertEquals("up", TrendDirection.UP.toWireValue());
        assertEquals("down", TrendDirection.DOWN.toWireValue());
        assertEquals("stable", TrendDirection.STABLE.toWireValue());
    }
}
