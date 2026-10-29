package com.sample.weatherservice.client.nws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import org.apache.http.impl.client.HttpClientBuilder;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NwsApiClientTest {

    @Test
    void source_isNws() {
        // given
        NwsApiClient client = new NwsApiClient(new NwsProperties(), HttpClientBuilder.create().build(),
                new ObjectMapper());

        // when + then
        assertEquals(WeatherSource.NWS, client.source());
    }

    @Test
    void fetch_stampsTheNwsSourceOnThePayload() {
        // given
        NwsApiClient client = new NwsApiClient(new NwsProperties(), HttpClientBuilder.create().build(),
                new ObjectMapper()) {
            @Override
            public Condition getCondition(Double latitude, Double longitude) {
                return new Condition(50.0, 40.0, "Clear", 48.0, "Clear skies");
            }
        };

        // when
        Condition condition = client.fetch(47.0, 8.0);

        // then
        assertEquals(WeatherSource.NWS, condition.getSource());
        assertEquals(50.0, condition.getTemperature());
    }

    @Test
    void parseWeatherData_mapsAFullObservationAndForecast() throws Exception {
        // given
        JsonNode observation = new ObjectMapper().readTree("""
                {"properties": {"temperature": {"value": 10.0}, "relativeHumidity": {"value": 70.0},
                                "textDescription": "Clear", "windChill": {"value": 8.0}}}
                """);
        JsonNode forecast = new ObjectMapper().readTree("""
                {"properties": {"periods": [{"detailedForecast": "Sunny and mild"}]}}
                """);

        // when
        Condition condition = NwsApiClient.parseWeatherData(observation, forecast);

        // then
        assertEquals(50.0, condition.getTemperature(), 0.0001);
        assertEquals(70.0, condition.getHumidity());
        assertEquals("Clear", condition.getDescription());
        assertEquals(46.4, condition.getApparentTemperature(), 0.0001);
        assertEquals("Sunny and mild", condition.getSummary());
    }

    @Test
    void parseWeatherData_missingTemperature_failsLoudlyInsteadOfReporting32F() throws Exception {
        // given
        JsonNode observation = new ObjectMapper().readTree("""
                {"properties": {"relativeHumidity": {"value": 70.0}, "textDescription": "Clear"}}
                """);

        // when + then
        NwsApiException exception = assertThrows(NwsApiException.class,
                () -> NwsApiClient.parseWeatherData(observation, new ObjectMapper().createObjectNode()));
        assertTrue(exception.getMessage().contains("temperature"));
    }

    @Test
    void parseWeatherData_missingHumidity_failsLoudly() throws Exception {
        // given
        JsonNode observation = new ObjectMapper().readTree("""
                {"properties": {"temperature": {"value": 10.0}, "textDescription": "Clear"}}
                """);

        // when + then
        NwsApiException exception = assertThrows(NwsApiException.class,
                () -> NwsApiClient.parseWeatherData(observation, new ObjectMapper().createObjectNode()));
        assertTrue(exception.getMessage().contains("humidity"));
    }

    @Test
    void parseWeatherData_blankDescription_failsLoudly() throws Exception {
        // given
        JsonNode observation = new ObjectMapper().readTree("""
                {"properties": {"temperature": {"value": 10.0}, "relativeHumidity": {"value": 70.0},
                                "textDescription": "  "}}
                """);

        // when + then
        NwsApiException exception = assertThrows(NwsApiException.class,
                () -> NwsApiClient.parseWeatherData(observation, new ObjectMapper().createObjectNode()));
        assertTrue(exception.getMessage().contains("text description"));
    }

    @Test
    void toFahrenheit_freezingPoint_returns32() {
        // when + then
        assertEquals(32.0, NwsApiClient.toFahrenheit(0.0), 0.0001);
    }

    @Test
    void toFahrenheit_boilingPoint_returns212() {
        // when + then
        assertEquals(212.0, NwsApiClient.toFahrenheit(100.0), 0.0001);
    }

    @Test
    void toFahrenheit_bodyTemperature_returns98Point6() {
        // when + then
        assertEquals(98.6, NwsApiClient.toFahrenheit(37.0), 0.0001);
    }

    @Test
    void toFahrenheit_negativeForty_returnsNegativeForty() {
        // when + then
        assertEquals(-40.0, NwsApiClient.toFahrenheit(-40.0), 0.0001);
    }

    @Test
    void toFahrenheit_negativeTen_returnsFourteen() {
        // when + then
        assertEquals(14.0, NwsApiClient.toFahrenheit(-10.0), 0.0001);
    }

    @Test
    void parseWeatherData_convertsWindFromKilometersPerHourAndKeepsTheDirection() throws Exception {
        // given 16.09344 km/h is exactly 10 mph
        JsonNode observation = new ObjectMapper().readTree("""
                {"properties": {"temperature": {"value": 10.0}, "relativeHumidity": {"value": 70.0},
                                "textDescription": "Clear",
                                "windSpeed": {"value": 16.09344}, "windDirection": {"value": 285.0}}}
                """);

        // when
        Condition condition = NwsApiClient.parseWeatherData(observation, new ObjectMapper().createObjectNode());

        // then
        assertEquals(10.0, condition.getWindSpeedMph(), 0.0001);
        assertEquals(285.0, condition.getWindDirectionDegrees(), 0.0001);
    }

    @Test
    void parseWeatherData_withoutWindLeavesBothWindFieldsNull() throws Exception {
        // given
        JsonNode observation = new ObjectMapper().readTree("""
                {"properties": {"temperature": {"value": 10.0}, "relativeHumidity": {"value": 70.0},
                                "textDescription": "Clear"}}
                """);

        // when
        Condition condition = NwsApiClient.parseWeatherData(observation, new ObjectMapper().createObjectNode());

        // then
        assertNull(condition.getWindSpeedMph());
        assertNull(condition.getWindDirectionDegrees());
    }

    @Test
    void toMph_convertsAndRounds() {
        // when + then
        assertEquals(10.0, NwsApiClient.toMph(16.09344), 0.0001);
        assertEquals(62.1, NwsApiClient.toMph(100.0), 0.0001);
        assertEquals(0.0, NwsApiClient.toMph(0.0), 0.0001);
    }
}
