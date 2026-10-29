package com.sample.weatherservice.service;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherHistoryResponse;
import com.sample.weatherservice.entity.WeatherRecord;
import com.sample.weatherservice.repository.WeatherRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class WeatherHistoryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WeatherHistoryService.class);

    private final WeatherRecordRepository repository;
    private final TemperatureTrendAnalyzer trendAnalyzer;

    public WeatherHistoryService(final WeatherRecordRepository repository,
                                 final TemperatureTrendAnalyzer trendAnalyzer) {
        this.repository = repository;
        this.trendAnalyzer = trendAnalyzer;
    }

    public void record(final double latitude, final double longitude, final Condition condition) {
        repository.save(new WeatherRecord(normalize(latitude), normalize(longitude),
                condition.getTemperature(), condition.getHumidity(), condition.getApparentTemperature(),
                condition.getDescription(), condition.getSummary(), condition.getSource(),
                condition.isCached(), Instant.now()));
        LOGGER.debug("Recorded weather history for lat: {}, lon: {}, source: {}, cached: {}",
                latitude, longitude, condition.getSource(), condition.isCached());
    }

    public WeatherHistoryResponse getHistory(final double latitude, final double longitude, final int days) {
        final BigDecimal normalizedLatitude = normalize(latitude);
        final BigDecimal normalizedLongitude = normalize(longitude);
        final Instant since = Instant.now().minus(Duration.ofDays(days));

        final List<WeatherRecord> records = repository
                .findByLatitudeAndLongitudeAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(
                        normalizedLatitude, normalizedLongitude, since);

        final TemperatureTrendAnalyzer.TrendResult trend = trendAnalyzer.analyze(records.stream()
                .map(record -> new TemperatureTrendAnalyzer.Sample(record.getRecordedAt(), record.getTemperature()))
                .toList());

        final List<WeatherHistoryResponse.Entry> entries = records.stream()
                .map(record -> new WeatherHistoryResponse.Entry(record.getRecordedAt(), record.getTemperature(),
                        record.getHumidity(), record.getApparentTemperature(), record.getDescription(),
                        record.getSummary(), record.getSource(), record.isCached()))
                .toList();

        return new WeatherHistoryResponse(normalizedLatitude, normalizedLongitude, days, entries,
                trend.direction(), trend.slopePerDay());
    }

    // Same 4-decimal normalization as the cache key, so history rows and cache entries always line up.
    static BigDecimal normalize(final double value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }
}
