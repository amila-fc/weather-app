package com.sample.weatherservice.client.darksky;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.INTERNAL_SERVER_ERROR)
public class DarkSkyApiException extends RuntimeException {
    public DarkSkyApiException(String message) {
        super(message);
    }
}
