package com.sample.weatherservice.client;

/**
 * Common failure for every {@link WeatherProvider}, so callers can treat provider problems uniformly.
 */
public class WeatherProviderException extends RuntimeException {

    public WeatherProviderException(String message) {
        super(message);
    }

    public WeatherProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
