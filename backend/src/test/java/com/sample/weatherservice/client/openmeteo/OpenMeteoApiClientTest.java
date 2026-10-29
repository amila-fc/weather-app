package com.sample.weatherservice.client.openmeteo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.WeatherProviderException;
import com.sample.weatherservice.config.WeatherProviderProperties;
import org.apache.http.client.HttpClient;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpGet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OpenMeteoApiClientTest {

    private static final String CURRENT_RESPONSE = """
            {
              "latitude": 47.0,
              "longitude": 8.0,
              "current": {
                "time": "2026-10-29T14:00",
                "temperature_2m": 57.9,
                "relative_humidity_2m": 74,
                "apparent_temperature": 56.1,
                "weather_code": 1
              },
              "temperature_unit": "°F"
            }
            """;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = mock(HttpClient.class);
    private final WeatherProviderProperties properties = new WeatherProviderProperties();

    private OpenMeteoApiClient client;

    @BeforeEach
    void setUp() {
        properties.getSecondary().setBaseUrl("https://open-meteo.test/v1/forecast");
        properties.getSecondary().setUserAgent("WeatherService/1.0 (test)");
        client = new OpenMeteoApiClient(properties, httpClient, objectMapper);
    }

    @Test
    void parse_mapsCurrentConditionsInFahrenheitWithoutConversion() throws Exception {
        // given
        JsonNode root = objectMapper.readTree(CURRENT_RESPONSE);

        // when
        Condition condition = OpenMeteoApiClient.parse(root);

        // then
        assertEquals(57.9, condition.getTemperature());
        assertEquals(74.0, condition.getHumidity());
        assertEquals(56.1, condition.getApparentTemperature());
        assertEquals("Mainly clear", condition.getDescription());
        assertEquals(WeatherSource.OPEN_METEO, condition.getSource());
    }

    @Test
    void parse_weatherCode_isMappedToADescription() {
        // when + then
        assertEquals("Clear sky", OpenMeteoApiClient.describe(0));
        assertEquals("Partly cloudy", OpenMeteoApiClient.describe(2));
        assertEquals("Rain", OpenMeteoApiClient.describe(63));
        assertEquals("Snow fall", OpenMeteoApiClient.describe(75));
        assertEquals("Thunderstorm with hail", OpenMeteoApiClient.describe(99));
        assertEquals("Unknown conditions", OpenMeteoApiClient.describe(-1));
    }

    @Test
    void parse_missingHumidity_isNullAndMissingApparentFallsBackToTemperature() throws Exception {
        // given
        JsonNode root = objectMapper.readTree("""
                {"current": {"temperature_2m": 41.5}}
                """);

        // when
        Condition condition = OpenMeteoApiClient.parse(root);

        // then
        assertNull(condition.getHumidity());
        assertEquals(41.5, condition.getApparentTemperature());
        assertEquals("Unknown conditions", condition.getDescription());
    }

    @Test
    void parse_missingTemperature_throwsWeatherProviderException() throws Exception {
        // given
        JsonNode root = objectMapper.readTree("""
                {"current": {"relative_humidity_2m": 70}}
                """);

        // when + then
        assertThrows(WeatherProviderException.class, () -> OpenMeteoApiClient.parse(root));
    }

    @Test
    void buildUrl_usesTheConfiguredBaseUrlAndFahrenheit() {
        // when
        String url = client.buildUrl(40.7128, -74.006);

        // then
        assertTrue(url.startsWith("https://open-meteo.test/v1/forecast?"), url);
        assertTrue(url.contains("latitude=40.7128"), url);
        assertTrue(url.contains("longitude=-74.0060"), url);
        assertTrue(url.contains("temperature_unit=fahrenheit"), url);
        assertTrue(url.contains("current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code"), url);
    }

    @Test
    void source_isOpenMeteo() {
        // when + then
        assertEquals(WeatherSource.OPEN_METEO, client.source());
    }

    @Test
    @SuppressWarnings("unchecked")
    void fetch_whenTheTransportFails_throwsWeatherProviderException() throws Exception {
        // given
        when(httpClient.execute(any(HttpGet.class), any(ResponseHandler.class)))
                .thenThrow(new IOException("connection reset"));

        // when + then
        WeatherProviderException exception = assertThrows(WeatherProviderException.class,
                () -> client.fetch(40.7128, -74.006));
        assertEquals(IOException.class, exception.getCause().getClass());
    }
}
