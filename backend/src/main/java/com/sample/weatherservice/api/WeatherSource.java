package com.sample.weatherservice.api;

import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * Which provider (or blend of providers) produced a weather payload, serialized to the wire as
 * {@code nws}, {@code open-meteo} or {@code averaged}.
 */
public enum WeatherSource {

    NWS,
    OPEN_METEO,
    AVERAGED;

    @JsonValue
    public String toWireValue() {
        return name().toLowerCase(Locale.ROOT).replace('_', '-');
    }
}
