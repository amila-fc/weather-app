package com.sample.weatherservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(WeatherCacheProperties.class)
public class CacheConfig {

    public static final String WEATHER_CACHE = "weather";

    @Bean
    public CacheManager cacheManager(final WeatherCacheProperties properties,
                                     final ObjectProvider<Ticker> tickerProvider) {
        return buildCacheManager(properties, tickerProvider.getIfAvailable(Ticker::systemTicker));
    }

    static CaffeineCacheManager buildCacheManager(final WeatherCacheProperties properties, final Ticker ticker) {
        validate(properties);

        final CaffeineCacheManager cacheManager = new CaffeineCacheManager(WEATHER_CACHE);
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .ticker(ticker)
                .expireAfterWrite(properties.getTtl())
                .maximumSize(properties.getMaxSize())
                .recordStats());
        return cacheManager;
    }

    private static void validate(final WeatherCacheProperties properties) {
        final Duration ttl = properties.getTtl();
        if (ttl == null || ttl.isZero() || ttl.isNegative()) {
            throw new IllegalStateException(
                    "weather.cache.ttl must be a positive duration such as 5m, but was: " + ttl);
        }
        if (properties.getMaxSize() < 1) {
            throw new IllegalStateException(
                    "weather.cache.max-size must be at least 1, but was: " + properties.getMaxSize());
        }
    }
}
