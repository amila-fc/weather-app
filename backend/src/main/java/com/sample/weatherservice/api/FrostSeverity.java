package com.sample.weatherservice.api;

import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * Frost severity bucket, serialized to the wire as its lowercase name ({@code none}, {@code light},
 * {@code moderate}, {@code severe}).
 */
public enum FrostSeverity {

    NONE,
    LIGHT,
    MODERATE,
    SEVERE;

    @JsonValue
    public String toWireValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
