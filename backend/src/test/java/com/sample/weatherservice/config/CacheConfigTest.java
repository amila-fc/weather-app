package com.sample.weatherservice.config;

import com.github.benmanes.caffeine.cache.Ticker;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.context.ApplicationContext;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class CacheConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(CacheConfig.class);

    @Test
    void cacheProperties_areBoundFromConfiguration() {
        runner.withPropertyValues("weather.cache.ttl=10s", "weather.cache.max-size=42")
                .run(context -> {
                    WeatherCacheProperties properties = context.getBean(WeatherCacheProperties.class);
                    assertThat(properties.getTtl()).isEqualTo(Duration.ofSeconds(10));
                    assertThat(properties.getMaxSize()).isEqualTo(42);
                });
    }

    @Test
    void cacheProperties_defaultToFiveMinutesAndAThousandEntries() {
        runner.run(context -> {
            WeatherCacheProperties properties = context.getBean(WeatherCacheProperties.class);
            assertThat(properties.getTtl()).isEqualTo(Duration.ofMinutes(5));
            assertThat(properties.getMaxSize()).isEqualTo(1000);
        });
    }

    @Test
    void weatherCache_isBoundedByTheConfiguredMaximum() {
        runner.withPropertyValues("weather.cache.max-size=7")
                .run(context -> assertThat(weatherCache(context).getNativeCache().policy().eviction()
                        .orElseThrow().getMaximum()).isEqualTo(7));
    }

    @Test
    void weatherCache_recordsHitAndMissStatistics() {
        runner.run(context -> {
            Cache cache = weatherCache(context);
            cache.get("47.0000,8.0000");
            cache.put("47.0000,8.0000", "stored");
            cache.get("47.0000,8.0000");

            assertThat(weatherCache(context).getNativeCache().stats().missCount()).isEqualTo(1);
            assertThat(weatherCache(context).getNativeCache().stats().hitCount()).isEqualTo(1);
        });
    }

    @Test
    void weatherCache_expiresEntriesAfterTheConfiguredTtl() {
        FakeTicker ticker = new FakeTicker();
        WeatherCacheProperties properties = new WeatherCacheProperties();
        properties.setTtl(Duration.ofSeconds(10));

        CaffeineCache cache = (CaffeineCache) CacheConfig.buildCacheManager(properties, ticker)
                .getCache(CacheConfig.WEATHER_CACHE);
        cache.put("47.0000,8.0000", "stored");

        ticker.advance(Duration.ofSeconds(10).plusMillis(1));

        assertThat(cache.get("47.0000,8.0000")).isNull();
    }

    @Test
    void nonPositiveTtl_failsStartupWithAClearMessage() {
        for (String ttl : new String[] {"0s", "-5m"}) {
            runner.withPropertyValues("weather.cache.ttl=" + ttl)
                    .run(context -> {
                        assertThat(context).hasFailed();
                        assertThat(context.getStartupFailure())
                                .hasStackTraceContaining("weather.cache.ttl must be a positive duration");
                    });
        }
    }

    @Test
    void nonPositiveMaxSize_failsStartupWithAClearMessage() {
        runner.withPropertyValues("weather.cache.max-size=0")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasStackTraceContaining("weather.cache.max-size must be at least 1");
                });
    }

    @Test
    void unparsableTtl_failsStartup() {
        runner.withPropertyValues("weather.cache.ttl=soon")
                .run(context -> assertThat(context).hasFailed());
    }

    private CaffeineCache weatherCache(ApplicationContext context) {
        return (CaffeineCache) context.getBean(CacheManager.class).getCache(CacheConfig.WEATHER_CACHE);
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
