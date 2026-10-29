package com.sample.weatherservice.repository;

import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.entity.WeatherRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
class WeatherRecordRepositoryTest {

    private static final BigDecimal LATITUDE = new BigDecimal("47.0000");
    private static final BigDecimal LONGITUDE = new BigDecimal("8.0000");
    private static final Instant NOW = Instant.now();

    @Autowired
    private WeatherRecordRepository repository;

    @Test
    void findByCoordinatesAndWindow_returnsMatchingRowsAscending() {
        // given
        repository.save(record(LATITUDE, LONGITUDE, NOW.minus(Duration.ofDays(1)), 50.0));
        repository.save(record(LATITUDE, LONGITUDE, NOW.minus(Duration.ofDays(2)), 60.0));
        repository.save(record(LATITUDE, LONGITUDE, NOW.minus(Duration.ofDays(10)), 70.0));
        repository.save(record(new BigDecimal("40.7128"), new BigDecimal("-74.0060"),
                NOW.minus(Duration.ofDays(1)), 30.0));

        // when
        List<WeatherRecord> records = repository
                .findByLatitudeAndLongitudeAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(
                        LATITUDE, LONGITUDE, NOW.minus(Duration.ofDays(3)));

        // then
        assertEquals(2, records.size());
        assertEquals(60.0, records.get(0).getTemperature());
        assertEquals(50.0, records.get(1).getTemperature());
        assertTrue(records.get(0).getRecordedAt().isBefore(records.get(1).getRecordedAt()));
    }

    @Test
    void findByCoordinatesAndWindow_excludesOtherCoordinates() {
        // given
        repository.save(record(new BigDecimal("40.7128"), new BigDecimal("-74.0060"),
                NOW.minus(Duration.ofHours(1)), 30.0));

        // when
        List<WeatherRecord> records = repository
                .findByLatitudeAndLongitudeAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(
                        LATITUDE, LONGITUDE, NOW.minus(Duration.ofDays(7)));

        // then
        assertTrue(records.isEmpty());
    }

    private static WeatherRecord record(BigDecimal latitude, BigDecimal longitude, Instant recordedAt,
                                        double temperature) {
        return new WeatherRecord(latitude, longitude, temperature, 55.0, temperature - 2,
                "Clear", "Clear skies", WeatherSource.NWS, false, recordedAt);
    }
}
