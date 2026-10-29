package com.sample.weatherservice.service;

import com.github.benmanes.caffeine.cache.Ticker;
import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.AllProvidersFailedException;
import com.sample.weatherservice.config.CacheConfig;
import com.sample.weatherservice.config.WeatherCacheProperties;
import com.sample.weatherservice.entity.WeatherRecord;
import com.sample.weatherservice.repository.WeatherRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@Import(WeatherServiceTest.FakeClockConfig.class)
class WeatherServiceTest {

    private static final FakeTicker TICKER = new FakeTicker();

    private static final Condition CLEAR =
            new Condition(78.5, 65.0, "Clear", 76.0, "Clear skies").withSource(WeatherSource.AVERAGED);

    @MockBean
    private WeatherAggregationService aggregationService;

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private WeatherCacheProperties cacheProperties;

    @Autowired
    private WeatherRecordRepository historyRepository;

    @BeforeEach
    void clearState() {
        weatherCache().clear();
        historyRepository.deleteAll();
    }

    @Test
    void getCondition_cacheMiss_fetchesOnceAndStoresTheUncachedCondition() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);

        // when
        Condition condition = weatherService.getCondition(47.0, 8.0);

        // then
        assertFalse(condition.isCached());
        verify(aggregationService, times(1)).getCondition(47.0, 8.0);
        Condition cached = weatherCache().get("47.0000,8.0000", Condition.class);
        assertNotNull(cached);
        assertFalse(cached.isCached(), "the cached value must not carry the cached flag");
    }

    @Test
    void getCondition_cacheHitWithinTtl_servesFromCacheWithoutCallingTheProviders() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);
        weatherService.getCondition(47.0, 8.0);

        // when
        Condition secondCall = weatherService.getCondition(47.0, 8.0);

        // then
        assertTrue(secondCall.isCached());
        assertEquals(CLEAR.getTemperature(), secondCall.getTemperature());
        assertEquals(CLEAR.getSummary(), secondCall.getSummary());
        assertEquals(WeatherSource.AVERAGED, secondCall.getSource(), "source must survive the cached flag");
        verify(aggregationService, times(1)).getCondition(47.0, 8.0);
    }

    @Test
    void getCondition_coordinatesNormalizingToTheSameKey_shareOneEntry() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);
        weatherService.getCondition(47.0, 8.0);

        // when
        Condition result = weatherService.getCondition(47.00001, 8.00001);

        // then
        assertEquals(WeatherService.cacheKey(47.0, 8.0), WeatherService.cacheKey(47.00001, 8.00001));
        assertTrue(result.isCached());
        verify(aggregationService, times(1)).getCondition(47.0, 8.0);
    }

    @Test
    void getCondition_differentCoordinates_createSeparateEntries() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);
        when(aggregationService.getCondition(40.7128, -74.006)).thenReturn(
                new Condition(50.0, 40.0, "Cloudy", 48.0, "Cloudy skies"));

        // when
        Condition first = weatherService.getCondition(47.0, 8.0);
        Condition second = weatherService.getCondition(40.7128, -74.006);

        // then
        assertFalse(first.isCached());
        assertFalse(second.isCached());
        assertEquals("Cloudy", second.getDescription());
        verify(aggregationService, times(1)).getCondition(47.0, 8.0);
        verify(aggregationService, times(1)).getCondition(40.7128, -74.006);
        assertNotNull(weatherCache().get("47.0000,8.0000"));
        assertNotNull(weatherCache().get("40.7128,-74.0060"));
    }

    @Test
    void getCondition_ttlElapsed_refetchesFromNwsAndReportsNotCached() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);
        weatherService.getCondition(47.0, 8.0);

        // when
        TICKER.advance(cacheProperties.getTtl().plusSeconds(1));
        Condition refetched = weatherService.getCondition(47.0, 8.0);

        // then
        assertFalse(refetched.isCached());
        verify(aggregationService, times(2)).getCondition(47.0, 8.0);
    }

    @Test
    void getCondition_allProvidersFail_isNotCachedAndTheNextCallRetries() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenThrow(new AllProvidersFailedException("Service unavailable"));

        // when
        assertThrows(AllProvidersFailedException.class, () -> weatherService.getCondition(47.0, 8.0));

        // then
        assertNull(weatherCache().get("47.0000,8.0000"), "a failed call must not populate the cache");

        doReturn(CLEAR).when(aggregationService).getCondition(47.0, 8.0);
        Condition retried = weatherService.getCondition(47.0, 8.0);

        assertFalse(retried.isCached());
        verify(aggregationService, times(2)).getCondition(47.0, 8.0);
    }

    @Test
    void cacheProperties_areTheDocumentedDefaults() {
        // then
        assertEquals(Duration.ofMinutes(5), cacheProperties.getTtl());
        assertEquals(1000, cacheProperties.getMaxSize());
    }

    @Test
    void getCondition_cacheMiss_recordsOneHistoryRow() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);

        // when
        weatherService.getCondition(47.0, 8.0);

        // then
        assertEquals(1, historyRepository.count());
        WeatherRecord stored = historyRepository.findAll().get(0);
        assertEquals(new BigDecimal("47.0000"), stored.getLatitude());
        assertEquals(new BigDecimal("8.0000"), stored.getLongitude());
        assertEquals(78.5, stored.getTemperature());
        assertEquals("Clear", stored.getDescription());
        assertEquals(WeatherSource.AVERAGED, stored.getSource());
        assertFalse(stored.isCached());
    }

    @Test
    void getCondition_cacheHit_stillRecordsARowWithTheCachedFlag() {
        // given
        when(aggregationService.getCondition(47.0, 8.0)).thenReturn(CLEAR);
        weatherService.getCondition(47.0, 8.0);

        // when
        weatherService.getCondition(47.0, 8.0);

        // then
        assertEquals(2, historyRepository.count());
        assertFalse(historyRepository.findAll().get(0).isCached());
        assertTrue(historyRepository.findAll().get(1).isCached(), "a cache hit is still a query and is recorded");
    }

    @Test
    void getCondition_allProvidersFail_recordsNoHistoryRow() {
        // given
        when(aggregationService.getCondition(47.0, 8.0))
                .thenThrow(new AllProvidersFailedException("No weather provider could serve the request"));

        // when
        assertThrows(AllProvidersFailedException.class, () -> weatherService.getCondition(47.0, 8.0));

        // then
        assertEquals(0, historyRepository.count());
    }

    private Cache weatherCache() {
        return cacheManager.getCache(CacheConfig.WEATHER_CACHE);
    }

    @TestConfiguration
    static class FakeClockConfig {

        @Bean
        Ticker ticker() {
            return TICKER;
        }
    }

    private static final class FakeTicker implements Ticker {

        private final AtomicLong nanos = new AtomicLong();

        @Override
        public long read() {
            return nanos.get();
        }

        void advance(Duration duration) {
            nanos.addAndGet(duration.toNanos());
        }
    }
}
