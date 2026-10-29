package com.sample.weatherservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tunables for the weather trends endpoint.
 */
@Component
@ConfigurationProperties(prefix = "weather.trends")
public class WeatherTrendsProperties {

    private int defaultHours = 24;
    private int maxHours = 48;

    /**
     * True while the series is generated rather than read from a historical source. It is echoed as
     * {@code mock} in the response so the UI can label synthetic data.
     */
    private boolean mock = true;

    public int getDefaultHours() {
        return defaultHours;
    }

    public void setDefaultHours(int defaultHours) {
        this.defaultHours = defaultHours;
    }

    public int getMaxHours() {
        return maxHours;
    }

    public void setMaxHours(int maxHours) {
        this.maxHours = maxHours;
    }

    public boolean isMock() {
        return mock;
    }

    public void setMock(boolean mock) {
        this.mock = mock;
    }
}
