package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.client.nws.NwsApiClient;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class WeatherController {

    private final NwsApiClient weatherApiClient;

    public WeatherController(NwsApiClient weatherApiClient) {
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
