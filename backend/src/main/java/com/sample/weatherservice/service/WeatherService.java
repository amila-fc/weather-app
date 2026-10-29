package com.sample.weatherservice.service;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.config.CacheConfig;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class WeatherService {

    private final WeatherConditionLoader conditionLoader;
    private final CacheManager cacheManager;
    private final WeatherHistoryService weatherHistoryService;

    public WeatherService(final WeatherConditionLoader conditionLoader, final CacheManager cacheManager,
                          final WeatherHistoryService weatherHistoryService) {
        this.conditionLoader = conditionLoader;
        this.cacheManager = cacheManager;
        this.weatherHistoryService = weatherHistoryService;
    }

    /**
     * Returns the current conditions for the coordinates, flagging whether the value was served from cache.
     *
     * <p>The cache key is the coordinates normalized to 4 decimal places, which is the precision the NWS
     * {@code /points/%.4f,%.4f} lookup uses, so coordinates differing below the 4th decimal share one entry.
     * The cache stores the condition as fetched ({@code cached=false}); the flag is set here on retrieval.
     *
     * <p>Every successful query is recorded in the weather history, cache hits included, because the query
     * still happened. A failed query throws before this point and therefore writes no history row.
     */
    public Condition getCondition(final double latitude, final double longitude) {
        final boolean fromCache = isCached(latitude, longitude);
        final Condition condition = conditionLoader.load(latitude, longitude);
        final Condition result = fromCache ? condition.withCached(true) : condition;
        weatherHistoryService.record(latitude, longitude, result);
        return result;
    }

    public static String cacheKey(final double latitude, final double longitude) {
        return String.format(Locale.ROOT, "%.4f,%.4f", latitude, longitude);
    }

    private boolean isCached(final double latitude, final double longitude) {
        final Cache weatherCache = cacheManager.getCache(CacheConfig.WEATHER_CACHE);
        return weatherCache != null && weatherCache.get(cacheKey(latitude, longitude)) != null;
    }
}
