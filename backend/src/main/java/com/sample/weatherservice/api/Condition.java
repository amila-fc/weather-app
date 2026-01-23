package com.sample.weatherservice.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Condition {

    /**
     * Ambient temperature in degrees Fahrenheit
     */
    @JsonProperty
    private Double temperature;

    /**
     * Relative humidity as percentage
     */
    @JsonProperty
    private Double humidity;

    /**
     * Current weather description
     */
    @JsonProperty
    private String description;

    /**
     * Apparent temperature (feels like) in degrees Fahrenheit
     */
    @JsonProperty
    private Double apparentTemperature;

    /**
     * Detailed weather summary
     */
    @JsonProperty
    private String summary;

    // Legacy constructor for backward compatibility
    public Condition(Double temperature) {
        this.temperature = temperature;
    }

    // Full constructor with all fields
    public Condition(Double temperature, Double humidity, String description,
                    Double apparentTemperature, String summary) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.description = description;
        this.apparentTemperature = apparentTemperature;
        this.summary = summary;
    }

    public Double getTemperature() {
        return temperature;
    }

    public Double getHumidity() {
        return humidity;
    }

    public String getDescription() {
        return description;
    }

    public Double getApparentTemperature() {
        return apparentTemperature;
    }

    public String getSummary() {
        return summary;
    }
}
