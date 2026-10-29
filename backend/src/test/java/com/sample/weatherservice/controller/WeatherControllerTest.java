package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.TrendDirection;
import com.sample.weatherservice.api.WeatherHistoryResponse;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.nws.NwsApiException;
import com.sample.weatherservice.service.WeatherHistoryService;
import com.sample.weatherservice.service.WeatherService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.MessageSource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WeatherControllerTest {

    private static final String CLEAR_SUMMARY = "Clear skies with warm temperatures";

    @MockBean
    private WeatherService weatherService;

    @MockBean
    private WeatherHistoryService weatherHistoryService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MessageSource messageSource;

    @Test
    void getWeather_returnSuccessfully() throws Exception {

        // given
        when(weatherService.getCondition(47.0, 8.0)).thenReturn(
            new Condition(78.5, 65.0, "Clear", 76.0, CLEAR_SUMMARY).withSource(WeatherSource.AVERAGED));

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(78.5))
                .andExpect(jsonPath("$.humidity").value(65.0))
                .andExpect(jsonPath("$.description").value("Clear"))
                .andExpect(jsonPath("$.apparentTemperature").value(76.0))
                .andExpect(jsonPath("$.summary").value(CLEAR_SUMMARY))
                .andExpect(jsonPath("$.cached").value(false))
                .andExpect(jsonPath("$.source").value("averaged"))
                .andExpect(jsonPath("$.frost_warning").value(false))
                .andExpect(jsonPath("$.frost_severity").value("none"))
                .andExpect(jsonPath("$.frost_advisory").isNotEmpty());
    }

    @Test
    void getWeather_cacheHit_reportsCachedTrue() throws Exception {

        // given
        when(weatherService.getCondition(47.0, 8.0)).thenReturn(
            new Condition(78.5, 65.0, "Clear", 76.0, CLEAR_SUMMARY, true).withSource(WeatherSource.NWS));

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(true))
                .andExpect(jsonPath("$.source").value("nws"))
                .andExpect(jsonPath("$.frost_warning").value(false))
                .andExpect(jsonPath("$.frost_severity").value("none"));
    }

    @Test
    void getWeather_belowFreezing_reportsLightFrostWithAnAdvisory() throws Exception {

        // given
        when(weatherService.getCondition(47.0, 8.0)).thenReturn(
            new Condition(31.9, 65.0, "Clear", 30.0, "Cold and clear").withSource(WeatherSource.OPEN_METEO));

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(31.9))
                .andExpect(jsonPath("$.source").value("open-meteo"))
                .andExpect(jsonPath("$.frost_warning").value(true))
                .andExpect(jsonPath("$.frost_severity").value("light"))
                .andExpect(jsonPath("$.frost_advisory").isNotEmpty());
    }

    @Test
    void getWeather_frostAdvisoryIsResolvedFromTheMessageBundle() throws Exception {

        // given
        when(weatherService.getCondition(47.0, 8.0)).thenReturn(
            new Condition(10.0, 65.0, "Snow", 2.0, "Snow showers"));
        String expectedAdvisory = messageSource.getMessage("frost.advisory.severe", null, Locale.ROOT);

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.frost_warning").value(true))
                .andExpect(jsonPath("$.frost_severity").value("severe"))
                .andExpect(jsonPath("$.frost_advisory").value(expectedAdvisory));
    }

    @Test
    void getWeather_nwsClient_throwsException() throws Exception {

        // given
        when(weatherService.getCondition(47.0, 8.0)).thenThrow(new NwsApiException("Service unavailable"));

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.error").value("Weather service unavailable"))
                .andExpect(jsonPath("$.frost_warning").doesNotExist())
                .andExpect(jsonPath("$.frost_severity").doesNotExist())
                .andExpect(jsonPath("$.frost_advisory").doesNotExist());
    }

    @Test
    void getHistory_returnsTheDocumentedContract() throws Exception {
        // given
        Instant first = Instant.parse("2026-10-28T10:00:00Z");
        Instant second = Instant.parse("2026-10-29T10:00:00Z");
        when(weatherHistoryService.getHistory(47.0, 8.0, 3)).thenReturn(new WeatherHistoryResponse(
                new BigDecimal("47.0000"), new BigDecimal("8.0000"), 3,
                List.of(
                        new WeatherHistoryResponse.Entry(first, 50.0, 60.0, 48.0, "Clear", "Clear skies",
                                WeatherSource.NWS, false),
                        new WeatherHistoryResponse.Entry(second, 55.0, 58.0, 53.0, "Cloudy", "Cloudy skies",
                                WeatherSource.AVERAGED, true)),
                TrendDirection.UP, 5.0));

        // when+then
        this.mockMvc.perform(get("/api/weather/history")
                        .param("lat", "47.0")
                        .param("long", "8.0")
                        .param("days", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(47.0))
                .andExpect(jsonPath("$.longitude").value(8.0))
                .andExpect(jsonPath("$.days").value(3))
                .andExpect(jsonPath("$.records[0].recordedAt").value("2026-10-28T10:00:00Z"))
                .andExpect(jsonPath("$.records[0].temperature").value(50.0))
                .andExpect(jsonPath("$.records[0].humidity").value(60.0))
                .andExpect(jsonPath("$.records[0].apparentTemperature").value(48.0))
                .andExpect(jsonPath("$.records[0].description").value("Clear"))
                .andExpect(jsonPath("$.records[0].summary").value("Clear skies"))
                .andExpect(jsonPath("$.records[0].source").value("nws"))
                .andExpect(jsonPath("$.records[0].cached").value(false))
                .andExpect(jsonPath("$.records[1].recordedAt").value("2026-10-29T10:00:00Z"))
                .andExpect(jsonPath("$.records[1].source").value("averaged"))
                .andExpect(jsonPath("$.records[1].cached").value(true))
                .andExpect(jsonPath("$.trend").value("up"))
                .andExpect(jsonPath("$.temperatureChange").value(5.0));
    }

    @Test
    void getHistory_daysOmitted_usesTheConfiguredDefault() throws Exception {
        // given
        when(weatherHistoryService.getHistory(47.0, 8.0, 7)).thenReturn(new WeatherHistoryResponse(
                new BigDecimal("47.0000"), new BigDecimal("8.0000"), 7, List.of(),
                TrendDirection.STABLE, 0.0));

        // when+then
        this.mockMvc.perform(get("/api/weather/history")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(7))
                .andExpect(jsonPath("$.records").isEmpty())
                .andExpect(jsonPath("$.trend").value("stable"))
                .andExpect(jsonPath("$.temperatureChange").value(0.0));

        verify(weatherHistoryService, times(1)).getHistory(47.0, 8.0, 7);
    }

    @Test
    void getHistory_daysOutOfRange_returns400() throws Exception {
        for (String days : new String[] {"0", "-1", "31"}) {
            this.mockMvc.perform(get("/api/weather/history")
                            .param("lat", "47.0")
                            .param("long", "8.0")
                            .param("days", days))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Invalid request"));
        }
    }

    @Test
    void getHistory_daysNotANumber_returns400() throws Exception {
        this.mockMvc.perform(get("/api/weather/history")
                        .param("lat", "47.0")
                        .param("long", "8.0")
                        .param("days", "many"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid request"));
    }

    @Test
    void getHistory_missingCoordinates_returns400() throws Exception {
        this.mockMvc.perform(get("/api/weather/history")
                        .param("lat", "47.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid request"));
    }

    @Test
    void getTrends_defaultWindow_returnsTheDashboardContract() throws Exception {
        // when+then
        this.mockMvc.perform(get("/api/weather/trends")
                        .param("lat", "37.7749")
                        .param("long", "-122.4194"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(37.7749))
                .andExpect(jsonPath("$.longitude").value(-122.4194))
                .andExpect(jsonPath("$.generatedAt").isNotEmpty())
                .andExpect(jsonPath("$.mock").value(true))
                .andExpect(jsonPath("$.hours").value(24))
                .andExpect(jsonPath("$.utcOffsetMinutes").value(-480))
                .andExpect(jsonPath("$.current.temperature").isNumber())
                .andExpect(jsonPath("$.current.humidity").isNumber())
                .andExpect(jsonPath("$.current.windSpeedMph").isNumber())
                .andExpect(jsonPath("$.current.windDirectionDegrees").isNumber())
                .andExpect(jsonPath("$.current.feelsLikeTemperature").isNumber())
                .andExpect(jsonPath("$.current.description").isNotEmpty())
                .andExpect(jsonPath("$.hourly", hasSize(24)))
                .andExpect(jsonPath("$.hourly[0].time").isNotEmpty())
                .andExpect(jsonPath("$.hourly[0].temperature").isNumber())
                .andExpect(jsonPath("$.hourly[0].humidity").isNumber())
                .andExpect(jsonPath("$.hourly[0].windSpeedMph").isNumber())
                .andExpect(jsonPath("$.hourly[0].windDirectionDegrees").isNumber())
                .andExpect(jsonPath("$.hourly[0].feelsLikeTemperature").isNumber())
                .andExpect(jsonPath("$.hourly[23].time").isNotEmpty())
                .andExpect(jsonPath("$.sunrise").isNotEmpty())
                .andExpect(jsonPath("$.sunset").isNotEmpty());
    }

    @Test
    void getTrends_hourlySeriesAscendsAndEndsAtTheGeneratedHour() throws Exception {
        // when
        String body = this.mockMvc.perform(get("/api/weather/trends")
                        .param("lat", "37.7749")
                        .param("long", "-122.4194"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // then
        JsonNode root = new ObjectMapper().readTree(body);
        Instant generatedAt = Instant.parse(root.get("generatedAt").asText());
        JsonNode hourly = root.get("hourly");
        assertEquals(generatedAt, Instant.parse(hourly.get(hourly.size() - 1).get("time").asText()));
        for (int index = 1; index < hourly.size(); index++) {
            Instant previous = Instant.parse(hourly.get(index - 1).get("time").asText());
            Instant current = Instant.parse(hourly.get(index).get("time").asText());
            assertTrue(previous.isBefore(current));
            assertEquals(Duration.ofHours(1), Duration.between(previous, current));
        }
    }

    @Test
    void getTrends_acceptsTheSmallestAndLargestWindow() throws Exception {
        // when+then
        this.mockMvc.perform(get("/api/weather/trends")
                        .param("lat", "47.0")
                        .param("long", "8.0")
                        .param("hours", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hours").value(1))
                .andExpect(jsonPath("$.hourly", hasSize(1)));

        this.mockMvc.perform(get("/api/weather/trends")
                        .param("lat", "47.0")
                        .param("long", "8.0")
                        .param("hours", "48"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hours").value(48))
                .andExpect(jsonPath("$.hourly", hasSize(48)));
    }

    @Test
    void getTrends_hoursOutOfRange_returns400() throws Exception {
        for (String hours : new String[] {"0", "-1", "49"}) {
            this.mockMvc.perform(get("/api/weather/trends")
                            .param("lat", "47.0")
                            .param("long", "8.0")
                            .param("hours", hours))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Invalid request"));
        }
    }

    @Test
    void getTrends_hoursNotANumber_returns400() throws Exception {
        this.mockMvc.perform(get("/api/weather/trends")
                        .param("lat", "47.0")
                        .param("long", "8.0")
                        .param("hours", "many"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid request"));
    }

    @Test
    void getTrends_missingCoordinates_returns400() throws Exception {
        this.mockMvc.perform(get("/api/weather/trends")
                        .param("lat", "47.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid request"));
    }

    @Test
    void unknownPath_returns404InsteadOfServerError() throws Exception {
        // when+then
        this.mockMvc.perform(get("/weather"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Request not processed"));
    }

    @Test
    void unknownApiPath_returns404() throws Exception {
        // when+then
        this.mockMvc.perform(get("/api/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Request not processed"));
    }

    @Test
    void unsupportedMethod_returns405InsteadOfServerError() throws Exception {
        // when+then
        this.mockMvc.perform(post("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error").value("Request not processed"));
    }
}