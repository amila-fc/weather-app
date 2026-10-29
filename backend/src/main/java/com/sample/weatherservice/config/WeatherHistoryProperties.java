package com.sample.weatherservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tunables for the weather history endpoint.
 */
@Component
@ConfigurationProperties(prefix = "weather.history")
public class WeatherHistoryProperties {

    private int defaultDays = 7;
    private int maxDays = 30;
    private double trendThreshold = 0.5;

    public int getDefaultDays() {
        return defaultDays;
    }

    public void setDefaultDays(int defaultDays) {
        this.defaultDays = defaultDays;
    }

    public int getMaxDays() {
        return maxDays;
    }

    public void setMaxDays(int maxDays) {
        this.maxDays = maxDays;
    }

    public double getTrendThreshold() {
        return trendThreshold;
    }

    public void setTrendThreshold(double trendThreshold) {
        this.trendThreshold = trendThreshold;
    }
}
