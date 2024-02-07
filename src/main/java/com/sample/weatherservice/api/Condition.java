package com.sample.weatherservice.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Condition {

    /**
     * Ambient temperature in degrees Celsius
     */
    @JsonProperty
    private Double temperature;

    public Condition(Double temperature) {
        this.temperature = temperature;
    }

    public Double getTemperature() {
        return temperature;
    }
}
