package com.sample.weatherservice.client;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;

/**
 * A source of current weather conditions.
 */
public interface WeatherProvider {

    /**
     * Fetches the current conditions for the coordinates.
     *
     * @throws WeatherProviderException when the provider cannot serve the request
     */
    Condition fetch(double latitude, double longitude);

    WeatherSource source();
}
