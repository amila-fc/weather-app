package com.sample.weatherservice.api;

import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * Direction of the temperature trend, serialized to the wire as {@code up}, {@code down} or {@code stable}.
 */
public enum TrendDirection {

    UP,
    DOWN,
    STABLE;

    @JsonValue
    public String toWireValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
