package com.sample.weatherservice.client.openmeteo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.WeatherProvider;
import com.sample.weatherservice.client.WeatherProviderException;
import com.sample.weatherservice.config.WeatherProviderProperties;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpGet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Locale;

@Service
public class OpenMeteoApiClient implements WeatherProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(OpenMeteoApiClient.class);

    private static final String CURRENT_PARAMETERS =
            "current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code";

    private final WeatherProviderProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenMeteoApiClient(final WeatherProviderProperties properties,
                              @Qualifier("openMeteoHttpClient") final HttpClient httpClient,
                              final ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    private final ResponseHandler<Condition> conditionResponseHandler = new ResponseHandler<>() {
        @Override
        public Condition handleResponse(final HttpResponse response) throws IOException {
            final int statusCode = response.getStatusLine().getStatusCode();
            final HttpEntity entity = response.getEntity();

            if (statusCode >= 400) {
                throw new WeatherProviderException("Open-Meteo API error: HTTP " + statusCode);
            }
            if (entity == null) {
                throw new WeatherProviderException("Open-Meteo API returned an empty body");
            }
            return parse(objectMapper.readTree(entity.getContent()));
        }
    };

    @Override
    public Condition fetch(final double latitude, final double longitude) {
        final HttpGet httpGet = new HttpGet(buildUrl(latitude, longitude));
        httpGet.setHeader("User-Agent", properties.getSecondary().getUserAgent());
        httpGet.setHeader("Accept", "application/json");

        try {
            return httpClient.execute(httpGet, conditionResponseHandler);
        } catch (IOException e) {
            LOGGER.warn("Could not get response from Open-Meteo for lat: {}, lon: {}", latitude, longitude, e);
            throw new WeatherProviderException("Could not get response from Open-Meteo API", e);
        }
    }

    @Override
    public WeatherSource source() {
        return WeatherSource.OPEN_METEO;
    }

    String buildUrl(final double latitude, final double longitude) {
        return String.format(Locale.ROOT,
                "%s?latitude=%.4f&longitude=%.4f&%s&temperature_unit=fahrenheit&timezone=UTC",
                properties.getSecondary().getBaseUrl(), latitude, longitude, CURRENT_PARAMETERS);
    }

    static Condition parse(final JsonNode root) {
        final JsonNode current = root.path("current");
        if (!current.hasNonNull("temperature_2m")) {
            throw new WeatherProviderException("Open-Meteo response is missing the current temperature");
        }

        final double temperature = current.get("temperature_2m").asDouble();
        final Double humidity = current.hasNonNull("relative_humidity_2m")
                ? current.get("relative_humidity_2m").asDouble()
                : null;
        final double apparentTemperature = current.hasNonNull("apparent_temperature")
                ? current.get("apparent_temperature").asDouble()
                : temperature;
        final String description = describe(current.path("weather_code").asInt(-1));

        return new Condition(temperature, humidity, description, apparentTemperature, description)
                .withSource(WeatherSource.OPEN_METEO);
    }

    static String describe(final int weatherCode) {
        return switch (weatherCode) {
            case 0 -> "Clear sky";
            case 1 -> "Mainly clear";
            case 2 -> "Partly cloudy";
            case 3 -> "Overcast";
            case 45 -> "Fog";
            case 48 -> "Depositing rime fog";
            case 51, 53, 55 -> "Drizzle";
            case 56, 57 -> "Freezing drizzle";
            case 61, 63, 65 -> "Rain";
            case 66, 67 -> "Freezing rain";
            case 71, 73, 75 -> "Snow fall";
            case 77 -> "Snow grains";
            case 80, 81, 82 -> "Rain showers";
            case 85, 86 -> "Snow showers";
            case 95 -> "Thunderstorm";
            case 96, 99 -> "Thunderstorm with hail";
            default -> "Unknown conditions";
        };
    }
}
