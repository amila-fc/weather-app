package com.sample.weatherservice.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Provider settings for the multi-provider weather integration. URLs are not defaulted in Java: they must be
 * supplied through configuration so the target hosts can be changed without a code change.
 */
@ConfigurationProperties(prefix = "weather")
public class WeatherProviderProperties implements InitializingBean {

    private final Primary primary = new Primary();
    private final Secondary secondary = new Secondary();
    private final Averaging averaging = new Averaging();

    public Primary getPrimary() {
        return primary;
    }

    public Secondary getSecondary() {
        return secondary;
    }

    public Averaging getAveraging() {
        return averaging;
    }

    @Override
    public void afterPropertiesSet() {
        requirePositive(primary.getTimeout(), "weather.primary.timeout");
        requirePositive(secondary.getTimeout(), "weather.secondary.timeout");
        requireText(secondary.getBaseUrl(), "weather.secondary.base-url");
        requireText(secondary.getUserAgent(), "weather.secondary.user-agent");
    }

    private static void requirePositive(Duration value, String name) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalStateException(name + " must be a positive duration such as 2s, but was: " + value);
        }
    }

    private static void requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must be configured");
        }
    }

    public static class Primary {

        private Duration timeout = Duration.ofSeconds(2);

        public Duration getTimeout() {
            return timeout;
        }

        public void setTimeout(Duration timeout) {
            this.timeout = timeout;
        }
    }

    public static class Secondary {

        private String baseUrl;
        private String userAgent;
        private Duration timeout = Duration.ofSeconds(2);

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getUserAgent() {
            return userAgent;
        }

        public void setUserAgent(String userAgent) {
            this.userAgent = userAgent;
        }

        public Duration getTimeout() {
            return timeout;
        }

        public void setTimeout(Duration timeout) {
            this.timeout = timeout;
        }
    }

    public static class Averaging {

        private boolean enabled = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
