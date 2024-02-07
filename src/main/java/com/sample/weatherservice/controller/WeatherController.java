package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.client.darksky.DarkSkyApiClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WeatherController {

    private final DarkSkyApiClient weatherApiClient;

    public WeatherController(DarkSkyApiClient weatherApiClient) {
        this.weatherApiClient = weatherApiClient;
    }


    @GetMapping("/status")
    public String getWeather() {
        return "Server is running.";
    }

    @GetMapping("/weather")
    public Condition getWeather(@RequestParam("lat") final Double latitude, @RequestParam("long") final Double longitude) {
        return weatherApiClient.getCondition(latitude, longitude);
    }
}
