package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherHistoryResponse;
import com.sample.weatherservice.api.WeatherTrendsResponse;
import com.sample.weatherservice.config.WeatherHistoryProperties;
import com.sample.weatherservice.config.WeatherTrendsProperties;
import com.sample.weatherservice.service.FrostWarningService;
import com.sample.weatherservice.service.WeatherHistoryService;
import com.sample.weatherservice.service.WeatherService;
import com.sample.weatherservice.service.WeatherTrendsService;
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
    private final WeatherTrendsService weatherTrendsService;
    private final WeatherTrendsProperties trendsProperties;

    public WeatherController(WeatherService weatherService, FrostWarningService frostWarningService,
                             WeatherHistoryService weatherHistoryService,
                             WeatherHistoryProperties historyProperties,
                             WeatherTrendsService weatherTrendsService,
                             WeatherTrendsProperties trendsProperties) {
        this.weatherService = weatherService;
        this.frostWarningService = frostWarningService;
        this.weatherHistoryService = weatherHistoryService;
        this.historyProperties = historyProperties;
        this.weatherTrendsService = weatherTrendsService;
        this.trendsProperties = trendsProperties;
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

    @GetMapping("/weather/trends")
    public WeatherTrendsResponse getTrends(@RequestParam("lat") final Double latitude,
                                           @RequestParam("long") final Double longitude,
                                           @RequestParam(value = "hours", required = false) final Integer hours) {
        final int resolvedHours = hours == null ? trendsProperties.getDefaultHours() : hours;
        if (resolvedHours < 1 || resolvedHours > trendsProperties.getMaxHours()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "hours must be between 1 and " + trendsProperties.getMaxHours());
        }
        return weatherTrendsService.getTrends(latitude, longitude, resolvedHours);
    }
}
