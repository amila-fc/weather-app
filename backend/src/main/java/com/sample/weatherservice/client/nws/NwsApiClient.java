package com.sample.weatherservice.client.nws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import com.sample.weatherservice.client.WeatherProvider;
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

@Service
public class NwsApiClient implements WeatherProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(NwsApiClient.class);

    private final NwsProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public NwsApiClient(NwsProperties properties, @Qualifier("nwsHttpClient") HttpClient httpClient,
                        ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public Condition fetch(final double latitude, final double longitude) {
        return getCondition(latitude, longitude).withSource(WeatherSource.NWS);
    }

    @Override
    public WeatherSource source() {
        return WeatherSource.NWS;
    }

    private final ResponseHandler<JsonNode> jsonNodeResponseHandler = new ResponseHandler<>() {
        @Override
        public JsonNode handleResponse(final HttpResponse response) throws IOException {
            int statusCode = response.getStatusLine().getStatusCode();
            HttpEntity entity = response.getEntity();

            if (entity != null) {
                JsonNode res = objectMapper.readTree(entity.getContent());

                if (statusCode >= 400) {
                    String error = res.has("detail") ? res.get("detail").asText() : "Unknown error";
                    throw new NwsApiException("NWS API error: " + error);
                }

                return res;
            } else {
                return null;
            }
        }
    };

    public Condition getCondition(Double latitude, Double longitude) {
        try {
            // Step 1: Get grid coordinates and forecast URLs
            String pointsUrl = String.format("%s/points/%.4f,%.4f", properties.getBaseUrl(), latitude, longitude);
            JsonNode pointsResponse = fetchResponse(pointsUrl);

            // Extract grid information
            String gridId = pointsResponse.at("/properties/gridId").asText();
            int gridX = pointsResponse.at("/properties/gridX").asInt();
            int gridY = pointsResponse.at("/properties/gridY").asInt();
            String stationsUrl = pointsResponse.at("/properties/observationStations").asText();

            // Step 2: Get current observations from nearest station
            JsonNode stationsResponse = fetchResponse(stationsUrl);
            String stationId = stationsResponse.at("/features/0/properties/stationIdentifier").asText();

            // Step 3: Get latest observation from the station
            String observationUrl = String.format("%s/stations/%s/observations/latest", properties.getBaseUrl(), stationId);
            JsonNode observationResponse = fetchResponse(observationUrl);

            // Step 4: Get forecast for additional data
            String forecastUrl = String.format("%s/gridpoints/%s/%d,%d/forecast",
                properties.getBaseUrl(), gridId, gridX, gridY);
            JsonNode forecastResponse = fetchResponse(forecastUrl);

            return parseWeatherData(observationResponse, forecastResponse);

        } catch (NwsApiException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.error("Failed to get weather data for lat: {}, lon: {}", latitude, longitude, e);
            throw new NwsApiException("Failed to get weather data", e);
        }
    }

    private JsonNode fetchResponse(String url) {
        HttpGet httpGet = new HttpGet(url);
        httpGet.setHeader("User-Agent", properties.getUserAgent());
        httpGet.setHeader("Accept", "application/geo+json");

        try {
            JsonNode response = httpClient.execute(httpGet, jsonNodeResponseHandler);
            LOGGER.debug("Received NWS response from {}: {}", url, response);
            return response;
        } catch (IOException e) {
            LOGGER.warn("Could not get response from: {}", url, e);
            throw new NwsApiException("Could not get response from NWS API", e);
        }
    }

    static Condition parseWeatherData(JsonNode observation, JsonNode forecast) {
        // A missing observation field must fail loudly: substituting 0.0/"" reported 32F and a blank
        // description for real stations. A failed provider lets the aggregator use Open-Meteo instead.
        JsonNode temperature = observation.at("/properties/temperature/value");
        if (!temperature.isNumber()) {
            throw new NwsApiException("NWS observation is missing the temperature");
        }
        Double tempC = temperature.asDouble();

        // Convert to Fahrenheit to match frontend expectations
        Double tempF = toFahrenheit(tempC);

        // Extract humidity (as percentage)
        JsonNode relativeHumidity = observation.at("/properties/relativeHumidity/value");
        if (!relativeHumidity.isNumber()) {
            throw new NwsApiException("NWS observation is missing the relative humidity");
        }
        Double humidity = relativeHumidity.asDouble();

        // Extract description from observation
        JsonNode textDescription = observation.at("/properties/textDescription");
        if (!textDescription.isTextual() || textDescription.asText().isBlank()) {
            throw new NwsApiException("NWS observation is missing the text description");
        }
        String description = textDescription.asText();

        // Get apparent temperature (heat index or wind chill if available)
        Double apparentTemp = tempF; // Default to actual temperature
        if (observation.at("/properties/heatIndex/value").isNumber()) {
            Double heatIndexC = observation.at("/properties/heatIndex/value").asDouble();
            apparentTemp = toFahrenheit(heatIndexC);
        } else if (observation.at("/properties/windChill/value").isNumber()) {
            Double windChillC = observation.at("/properties/windChill/value").asDouble();
            apparentTemp = toFahrenheit(windChillC);
        }

        // Get summary from forecast (first period)
        String summary = "";
        if (forecast.at("/properties/periods/0/detailedForecast").isTextual()) {
            summary = forecast.at("/properties/periods/0/detailedForecast").asText();
        }

        return new Condition(tempF, humidity, description, apparentTemp, summary);
    }

    static double toFahrenheit(double celsius) {
        return celsius * 9.0 / 5.0 + 32.0;
    }
}