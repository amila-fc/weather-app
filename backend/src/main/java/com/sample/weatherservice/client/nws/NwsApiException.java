package com.sample.weatherservice.client.nws;

public class NwsApiException extends RuntimeException {

    public NwsApiException(String message) {
        super(message);
    }

    public NwsApiException(String message, Throwable cause) {
        super(message, cause);
    }
}