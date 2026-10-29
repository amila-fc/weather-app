package com.sample.weatherservice.service;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.TrendDirection;
import com.sample.weatherservice.api.WeatherHistoryResponse;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.config.WeatherHistoryProperties;
import com.sample.weatherservice.entity.WeatherRecord;
import com.sample.weatherservice.repository.WeatherRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import({WeatherHistoryService.class, TemperatureTrendAnalyzer.class})
class WeatherHistoryServiceTest {

    private static final BigDecimal LATITUDE = new BigDecimal("47.0000");
    private static final BigDecimal LONGITUDE = new BigDecimal("8.0000");
    private static final Instant NOW = Instant.now();

    @Autowired
    private WeatherHistoryService historyService;

    @Autowired
    private WeatherRecordRepository repository;

    @TestConfiguration
    static class PropertiesConfig {

        @Bean
        WeatherHistoryProperties weatherHistoryProperties() {
            return new WeatherHistoryProperties();
        }
    }

    @Test
    void record_persistsOneRowWithNormalizedCoordinatesAndTheResponseValues() {
        // given
        Condition condition = new Condition(55.5, 60.0, "Clear", 54.0, "Clear skies")
                .withSource(WeatherSource.AVERAGED).withCached(true);

        // when
        historyService.record(47.0, 8.0, condition);

        // then
        assertEquals(1, repository.count());
        WeatherRecord stored = repository.findAll().get(0);
        assertEquals(0, LATITUDE.compareTo(stored.getLatitude()));
        assertEquals(0, LONGITUDE.compareTo(stored.getLongitude()));
        assertEquals(55.5, stored.getTemperature());
        assertEquals(60.0, stored.getHumidity());
        assertEquals(54.0, stored.getApparentTemperature());
        assertEquals("Clear", stored.getDescription());
        assertEquals("Clear skies", stored.getSummary());
        assertEquals(WeatherSource.AVERAGED, stored.getSource());
        assertTrue(stored.isCached());
        assertTrue(stored.getRecordedAt().isBefore(Instant.now().plusSeconds(1)));
    }

    @Test
    void record_coordinatesDifferingInTheFifthDecimal_mapToTheSameStoredCoordinates() {
        // when
        historyService.record(47.00001, 8.00001, new Condition(55.5).withSource(WeatherSource.NWS));

        // then
        WeatherRecord stored = repository.findAll().get(0);
        assertEquals(new BigDecimal("47.0000"), stored.getLatitude());
        assertEquals(new BigDecimal("8.0000"), stored.getLongitude());
        assertEquals(1, historyService.getHistory(47.0, 8.0, 7).records().size(),
                "reading with the unnormalized coordinates must find the same row");
    }

    @Test
    void getHistory_filtersByCoordinatesAndWindowInAscendingOrder() {
        // given
        repository.save(record(NOW.minus(Duration.ofDays(1)), 50.0));
        repository.save(record(NOW.minus(Duration.ofDays(2)), 60.0));
        repository.save(record(NOW.minus(Duration.ofDays(10)), 70.0));
        repository.save(new WeatherRecord(new BigDecimal("40.7128"), new BigDecimal("-74.0060"), 30.0, 50.0, 28.0,
                "Cloudy", "Cloudy skies", WeatherSource.OPEN_METEO, false, NOW.minus(Duration.ofHours(1))));

        // when
        WeatherHistoryResponse response = historyService.getHistory(47.0, 8.0, 3);

        // then
        assertEquals(2, response.records().size());
        assertEquals(60.0, response.records().get(0).temperature());
        assertEquals(50.0, response.records().get(1).temperature());
        assertTrue(response.records().get(0).recordedAt().isBefore(response.records().get(1).recordedAt()));
        assertEquals(TrendDirection.DOWN, response.trend());
        assertEquals(-10.0, response.temperatureChange(), 0.0001);
        assertEquals(3, response.days());
        assertEquals(0, LATITUDE.compareTo(response.latitude()));
        assertEquals(0, LONGITUDE.compareTo(response.longitude()));
    }

    @Test
    void getHistory_withoutRecords_returnsAnEmptyStableResponse() {
        // when
        WeatherHistoryResponse response = historyService.getHistory(47.0, 8.0, 7);

        // then
        assertTrue(response.records().isEmpty());
        assertEquals(TrendDirection.STABLE, response.trend());
        assertEquals(0.0, response.temperatureChange());
    }

    @Test
    void getHistory_withASingleRecord_returnsItWithAStableTrend() {
        // given
        repository.save(record(NOW.minus(Duration.ofHours(2)), 42.0));

        // when
        WeatherHistoryResponse response = historyService.getHistory(47.0, 8.0, 7);

        // then
        assertEquals(1, response.records().size());
        assertEquals(42.0, response.records().get(0).temperature());
        assertEquals(TrendDirection.STABLE, response.trend());
        assertEquals(0.0, response.temperatureChange());
        assertFalse(response.records().get(0).cached());
    }

    @Test
    void getHistory_reportsTheProviderSourceOfEveryRecord() {
        // given
        repository.save(new WeatherRecord(LATITUDE, LONGITUDE, 60.0, 50.0, 58.0, "Clear", "Clear skies",
                WeatherSource.AVERAGED, true, NOW.minus(Duration.ofHours(1))));

        // when
        List<WeatherHistoryResponse.Entry> records = historyService.getHistory(47.0, 8.0, 7).records();

        // then
        assertEquals(1, records.size());
        assertEquals(WeatherSource.AVERAGED, records.get(0).source());
        assertTrue(records.get(0).cached());
        assertEquals("Clear skies", records.get(0).summary());
    }

    private static WeatherRecord record(Instant recordedAt, double temperature) {
        return new WeatherRecord(LATITUDE, LONGITUDE, temperature, 55.0, temperature - 2,
                "Clear", "Clear skies", WeatherSource.NWS, false, recordedAt);
    }
}
