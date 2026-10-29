package com.sample.weatherservice.service;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.AllProvidersFailedException;
import com.sample.weatherservice.client.WeatherProvider;
import com.sample.weatherservice.config.WeatherProviderProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Calls the NWS and Open-Meteo providers concurrently and combines whatever they return: both → averaged,
 * one → that provider's payload, none → {@link AllProvidersFailedException}.
 *
 * <p>A provider that fails is never waited on. A provider that answers nothing within its own budget is
 * abandoned at that budget, so the request never blocks beyond {@code max(primary.timeout, secondary.timeout)}.
 */
@Service
public class WeatherAggregationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WeatherAggregationService.class);

    private final WeatherProvider primary;
    private final WeatherProvider secondary;
    private final ExecutorService executor;
    private final WeatherProviderProperties properties;

    public WeatherAggregationService(@Qualifier("nwsApiClient") final WeatherProvider primary,
                                     @Qualifier("openMeteoApiClient") final WeatherProvider secondary,
                                     final ExecutorService weatherProviderExecutor,
                                     final WeatherProviderProperties properties) {
        this.primary = primary;
        this.secondary = secondary;
        this.executor = weatherProviderExecutor;
        this.properties = properties;
    }

    public Condition getCondition(final double latitude, final double longitude) {
        final CompletableFuture<Condition> primaryFuture = request(primary, latitude, longitude);
        final CompletableFuture<Condition> secondaryFuture = request(secondary, latitude, longitude);

        final Condition primaryResult = await(primaryFuture, properties.getPrimary().getTimeout(),
                primary.source(), latitude, longitude);
        final Condition secondaryResult = await(secondaryFuture, properties.getSecondary().getTimeout(),
                secondary.source(), latitude, longitude);

        return combine(primaryResult, secondaryResult);
    }

    private CompletableFuture<Condition> request(final WeatherProvider provider, final double latitude,
                                                 final double longitude) {
        return CompletableFuture.supplyAsync(() -> provider.fetch(latitude, longitude), executor);
    }

    private Condition await(final CompletableFuture<Condition> future, final Duration timeout,
                            final WeatherSource source,
                            final double latitude, final double longitude) {
        final long startNanos = System.nanoTime();
        try {
            return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            LOGGER.warn("Provider {} timed out after {} ms for lat: {}, lon: {} (elapsed {} ms)",
                    source.toWireValue(), timeout.toMillis(), latitude, longitude, elapsedMillis(startNanos));
            return null;
        } catch (ExecutionException e) {
            LOGGER.warn("Provider {} failed for lat: {}, lon: {} after {} ms: {}",
                    source.toWireValue(), latitude, longitude, elapsedMillis(startNanos), e.getCause().toString());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            future.cancel(true);
            LOGGER.warn("Interrupted while waiting for provider {} for lat: {}, lon: {}",
                    source.toWireValue(), latitude, longitude);
            return null;
        }
    }

    private Condition combine(final Condition primaryResult, final Condition secondaryResult) {
        if (primaryResult != null && secondaryResult != null) {
            return properties.getAveraging().isEnabled()
                    ? Condition.averaged(primaryResult, secondaryResult)
                    : primaryResult;
        }
        if (primaryResult != null) {
            return primaryResult;
        }
        if (secondaryResult != null) {
            return secondaryResult;
        }
        throw new AllProvidersFailedException("No weather provider could serve the request");
    }

    private static long elapsedMillis(final long startNanos) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
    }
}
