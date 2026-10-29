package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherHistoryResponse;
import com.sample.weatherservice.config.WeatherHistoryProperties;
import com.sample.weatherservice.service.FrostWarningService;
import com.sample.weatherservice.service.WeatherHistoryService;
import com.sample.weatherservice.service.WeatherService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class WeatherController {

    private final WeatherService weatherService;
    private final FrostWarningService frostWarningService;
    private final WeatherHistoryService weatherHistoryService;
    private final WeatherHistoryProperties historyProperties;

    public WeatherController(WeatherService weatherService, FrostWarningService frostWarningService,
                             WeatherHistoryService weatherHistoryService,
                             WeatherHistoryProperties historyProperties) {
        this.weatherService = weatherService;
        this.frostWarningService = frostWarningService;
        this.weatherHistoryService = weatherHistoryService;
        this.historyProperties = historyProperties;
    }


    @GetMapping("/status")
    public String getWeather() {
        return "Server is running.";
    }

    @GetMapping("/weather")
    public Condition getWeather(@RequestParam("lat") final Double latitude, @RequestParam("long") final Double longitude) {
        final Condition condition = weatherService.getCondition(latitude, longitude);
        return condition.withFrost(frostWarningService.assess(condition.getTemperature()));
    }

    @GetMapping("/weather/history")
    public WeatherHistoryResponse getHistory(@RequestParam("lat") final Double latitude,
                                             @RequestParam("long") final Double longitude,
                                             @RequestParam(value = "days", required = false) final Integer days) {
        final int resolvedDays = days == null ? historyProperties.getDefaultDays() : days;
        if (resolvedDays < 1 || resolvedDays > historyProperties.getMaxDays()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "days must be between 1 and " + historyProperties.getMaxDays());
        }
        return weatherHistoryService.getHistory(latitude, longitude, resolvedDays);
    }
}
