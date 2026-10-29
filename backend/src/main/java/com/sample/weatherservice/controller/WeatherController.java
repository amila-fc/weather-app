package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.ErrorResponse;
import com.sample.weatherservice.api.WeatherHistoryResponse;
import com.sample.weatherservice.api.WeatherTrendsResponse;
import com.sample.weatherservice.config.WeatherHistoryProperties;
import com.sample.weatherservice.config.WeatherTrendsProperties;
import com.sample.weatherservice.service.FrostWarningService;
import com.sample.weatherservice.service.WeatherHistoryService;
import com.sample.weatherservice.service.WeatherService;
import com.sample.weatherservice.service.WeatherTrendsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST surface of the service.
 *
 * <p>The springdoc annotations on each mapping are the source of the OpenAPI contract served at
 * {@code /v3/api-docs} (UI at {@code /swagger-ui.html}), so they live next to the mapping they describe.
 * Payload shapes are not annotated here: the response records and {@code Condition} already carry the
 * Jackson names the contract should publish.
 */
@Tag(name = "Weather", description = "Current conditions, recorded history and the 24-hour trends series")
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


    @Operation(summary = "Health check", description = "Returns a fixed sentence while the service is up.")
    @ApiResponse(responseCode = "200", description = "The service is running",
            content = @Content(mediaType = MediaType.TEXT_PLAIN_VALUE, schema = @Schema(example = "Server is running.")))
    @GetMapping("/status")
    public String getWeather() {
        return "Server is running.";
    }

    @Operation(summary = "Current weather conditions",
            description = """
                    Aggregates the configured providers (NWS primary, Open-Meteo fallback and averaging partner) and
                    applies the frost assessment derived from the returned temperature. Every successful call is
                    recorded in the weather history, cache hits included.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current conditions with the frost assessment applied"),
            @ApiResponse(responseCode = "400", description = "A coordinate is missing or not a number",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "503", description = "Every weather provider failed, so no history row was written",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/weather")
    public Condition getWeather(
            @Parameter(description = "Latitude in decimal degrees", required = true, example = "47.0")
            @RequestParam("lat") final Double latitude,
            @Parameter(description = "Longitude in decimal degrees", required = true, example = "8.0")
            @RequestParam("long") final Double longitude) {
        final Condition condition = weatherService.getCondition(latitude, longitude);
        return condition.withFrost(frostWarningService.assess(condition.getTemperature()));
    }

    @Operation(summary = "Recorded history and temperature trend",
            description = """
                    Returns the ascending weather records written for these coordinates inside the window, plus the
                    least-squares temperature trend. History lives in an in-memory database, so it is lost on
                    restart.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ascending records for the window plus the trend"),
            @ApiResponse(responseCode = "400",
                    description = "A coordinate is missing or not a number, or days is outside the allowed window",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/weather/history")
    public WeatherHistoryResponse getHistory(
            @Parameter(description = "Latitude in decimal degrees", required = true, example = "47.0")
            @RequestParam("lat") final Double latitude,
            @Parameter(description = "Longitude in decimal degrees", required = true, example = "8.0")
            @RequestParam("long") final Double longitude,
            @Parameter(description = "Window in days, ending now. Defaults to 7 and must be between 1 and 30",
                    example = "3")
            @RequestParam(value = "days", required = false) final Integer days) {
        final int resolvedDays = days == null ? historyProperties.getDefaultDays() : days;
        if (resolvedDays < 1 || resolvedDays > historyProperties.getMaxDays()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "days must be between 1 and " + historyProperties.getMaxDays());
        }
        return weatherHistoryService.getHistory(latitude, longitude, resolvedDays);
    }

    @Operation(summary = "24-hour trends series",
            description = """
                    Hourly temperature, humidity, wind and feels-like series for the location, together with sunrise
                    and sunset. The payload carries "mock": true while the series is generated rather than
                    observed.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Hourly series, current hour and sun times"),
            @ApiResponse(responseCode = "400",
                    description = "A coordinate is missing or not a number, or hours is outside the allowed window",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/weather/trends")
    public WeatherTrendsResponse getTrends(
            @Parameter(description = "Latitude in decimal degrees", required = true, example = "47.0")
            @RequestParam("lat") final Double latitude,
            @Parameter(description = "Longitude in decimal degrees", required = true, example = "8.0")
            @RequestParam("long") final Double longitude,
            @Parameter(description = "Series length in hours. Defaults to 24 and must be between 1 and 48",
                    example = "24")
            @RequestParam(value = "hours", required = false) final Integer hours) {
        final int resolvedHours = hours == null ? trendsProperties.getDefaultHours() : hours;
        if (resolvedHours < 1 || resolvedHours > trendsProperties.getMaxHours()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "hours must be between 1 and " + trendsProperties.getMaxHours());
        }
        return weatherTrendsService.getTrends(latitude, longitude, resolvedHours);
    }
}
