package com.sample.weatherservice.service;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.AllProvidersFailedException;
import com.sample.weatherservice.client.WeatherProvider;
import com.sample.weatherservice.client.WeatherProviderException;
import com.sample.weatherservice.client.nws.NwsApiException;
import com.sample.weatherservice.config.WeatherProviderProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WeatherAggregationServiceTest {

    private static final Condition NWS_CONDITION =
            new Condition(70.0, 50.0, "Clear", 68.0, "NWS summary").withSource(WeatherSource.NWS);

    private static final Condition OPEN_METEO_CONDITION =
            new Condition(60.0, 70.0, "Cloudy", 58.0, "Cloudy over the bay").withSource(WeatherSource.OPEN_METEO);

    private final WeatherProvider primary = mock(WeatherProvider.class);
    private final WeatherProvider secondary = mock(WeatherProvider.class);
    private final WeatherProviderProperties properties = new WeatherProviderProperties();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    private WeatherAggregationService service;

    @BeforeEach
    void setUp() {
        properties.getPrimary().setTimeout(Duration.ofMillis(200));
        properties.getSecondary().setTimeout(Duration.ofMillis(200));
        when(primary.source()).thenReturn(WeatherSource.NWS);
        when(secondary.source()).thenReturn(WeatherSource.OPEN_METEO);
        service = new WeatherAggregationService(primary, secondary, executor, properties);
    }

    @AfterEach
    void tearDown() {
        executor.shutdownNow();
    }

    @Test
    void getCondition_bothProvidersSucceed_averagesNumbersAndKeepsPrimaryText() {
        // given
        when(primary.fetch(47.0, 8.0)).thenReturn(NWS_CONDITION);
        when(secondary.fetch(47.0, 8.0)).thenReturn(OPEN_METEO_CONDITION);

        // when
        Condition result = service.getCondition(47.0, 8.0);

        // then
        assertEquals(65.0, result.getTemperature());
        assertEquals(60.0, result.getHumidity());
        assertEquals(63.0, result.getApparentTemperature());
        assertEquals("Clear", result.getDescription());
        assertEquals("NWS summary", result.getSummary());
        assertEquals(WeatherSource.AVERAGED, result.getSource());
    }

    @Test
    void getCondition_averagingDisabled_returnsThePrimaryPayloadVerbatim() {
        // given
        properties.getAveraging().setEnabled(false);
        when(primary.fetch(47.0, 8.0)).thenReturn(NWS_CONDITION);
        when(secondary.fetch(47.0, 8.0)).thenReturn(OPEN_METEO_CONDITION);

        // when
        Condition result = service.getCondition(47.0, 8.0);

        // then
        assertEquals(70.0, result.getTemperature());
        assertEquals("NWS summary", result.getSummary());
        assertEquals(WeatherSource.NWS, result.getSource());
    }

    @Test
    void getCondition_primaryFailsImmediately_returnsSecondaryWithoutWaitingOutTheBudget() {
        // given
        properties.getPrimary().setTimeout(Duration.ofSeconds(10));
        when(primary.fetch(47.0, 8.0)).thenThrow(new NwsApiException("connection refused"));
        when(secondary.fetch(47.0, 8.0)).thenReturn(OPEN_METEO_CONDITION);

        // when
        long startNanos = System.nanoTime();
        Condition result = service.getCondition(47.0, 8.0);
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);

        // then
        assertEquals(WeatherSource.OPEN_METEO, result.getSource());
        assertEquals(60.0, result.getTemperature());
        assertTrue(elapsedMillis < 2000, "a failed primary must not be waited on, took " + elapsedMillis + " ms");
        verify(primary, times(1)).fetch(47.0, 8.0);
        verify(secondary, times(1)).fetch(47.0, 8.0);
    }

    @Test
    void getCondition_primaryTimesOut_returnsSecondaryWithinTheConfiguredBudget() {
        // given
        CountDownLatch release = new CountDownLatch(1);
        when(primary.fetch(47.0, 8.0)).thenAnswer(invocation -> {
            awaitQuietly(release);
            throw new NwsApiException("abandoned");
        });
        when(secondary.fetch(47.0, 8.0)).thenReturn(OPEN_METEO_CONDITION);

        try {
            // when
            long startNanos = System.nanoTime();
            Condition result = service.getCondition(47.0, 8.0);
            long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);

            // then
            assertEquals(WeatherSource.OPEN_METEO, result.getSource());
            assertTrue(elapsedMillis >= 100, "the primary budget should have been spent, took " + elapsedMillis + " ms");
            assertTrue(elapsedMillis < 2000, "the request must not block beyond the configured budget, took "
                    + elapsedMillis + " ms");
        } finally {
            release.countDown();
        }
    }

    @Test
    void getCondition_secondaryTimesOut_returnsPrimary() {
        // given
        CountDownLatch release = new CountDownLatch(1);
        when(primary.fetch(47.0, 8.0)).thenReturn(NWS_CONDITION);
        when(secondary.fetch(47.0, 8.0)).thenAnswer(invocation -> {
            awaitQuietly(release);
            throw new WeatherProviderException("abandoned");
        });

        try {
            // when
            Condition result = service.getCondition(47.0, 8.0);

            // then
            assertEquals(WeatherSource.NWS, result.getSource());
            assertEquals(70.0, result.getTemperature());
        } finally {
            release.countDown();
        }
    }

    @Test
    void getCondition_secondaryFails_returnsPrimary() {
        // given
        when(primary.fetch(47.0, 8.0)).thenReturn(NWS_CONDITION);
        when(secondary.fetch(47.0, 8.0)).thenThrow(new WeatherProviderException("HTTP 500"));

        // when
        Condition result = service.getCondition(47.0, 8.0);

        // then
        assertEquals(WeatherSource.NWS, result.getSource());
        assertEquals("NWS summary", result.getSummary());
    }

    @Test
    void getCondition_bothProvidersFail_raisesAllProvidersFailedException() {
        // given
        when(primary.fetch(47.0, 8.0)).thenThrow(new NwsApiException("connection refused"));
        when(secondary.fetch(47.0, 8.0)).thenThrow(new WeatherProviderException("HTTP 500"));

        // when + then
        assertThrows(AllProvidersFailedException.class, () -> service.getCondition(47.0, 8.0));
    }

    private static void awaitQuietly(CountDownLatch latch) {
        try {
            latch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
