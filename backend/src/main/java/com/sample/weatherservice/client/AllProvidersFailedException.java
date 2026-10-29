package com.sample.weatherservice.client;

/**
 * Raised when no weather provider could serve a request.
 */
public class AllProvidersFailedException extends WeatherProviderException {

    public AllProvidersFailedException(String message) {
        super(message);
    }

    public AllProvidersFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
