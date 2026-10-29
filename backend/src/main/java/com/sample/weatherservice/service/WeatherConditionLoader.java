package com.sample.weatherservice.service;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.client.WeatherProviderException;
import com.sample.weatherservice.config.CacheConfig;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

/**
 * Fetches conditions from the weather providers through the {@code weather} cache.
 *
 * <p>This is a separate bean from {@link WeatherService} on purpose: {@code @Cacheable} is applied by a
 * Spring proxy, so the call has to cross a bean boundary to be intercepted. The cached value is always the
 * aggregated condition exactly as fetched (including its {@code source}); the {@code cached} flag is applied
 * by {@link WeatherService} on retrieval.
 */
@Component
public class WeatherConditionLoader {

    private final WeatherAggregationService aggregationService;

    public WeatherConditionLoader(final WeatherAggregationService aggregationService) {
        this.aggregationService = aggregationService;
    }

    @Cacheable(cacheNames = CacheConfig.WEATHER_CACHE,
            key = "T(com.sample.weatherservice.service.WeatherService).cacheKey(#latitude, #longitude)")
    public Condition load(final double latitude, final double longitude) {
        return aggregationService.getCondition(latitude, longitude);
    }
}
