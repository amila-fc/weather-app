package com.sample.weatherservice.client.nws;

import com.sample.weatherservice.client.WeatherProviderException;

public class NwsApiException extends WeatherProviderException {

    public NwsApiException(String message) {
        super(message);
    }

    public NwsApiException(String message, Throwable cause) {
        super(message, cause);
    }
}