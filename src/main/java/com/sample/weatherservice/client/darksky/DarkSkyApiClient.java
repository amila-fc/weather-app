package com.sample.weatherservice.client.darksky;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.weatherservice.api.Condition;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpGet;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class DarkSkyApiClient {

    private static final org.slf4j.Logger LOGGER = LoggerFactory.getLogger(DarkSkyApiClient.class);

    private final DarkSkyProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DarkSkyApiClient(DarkSkyProperties properties, HttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    private final ResponseHandler<JsonNode> jsonNodeResponseHandler = new ResponseHandler<>() {
        @Override
        public JsonNode handleResponse(
                final HttpResponse response) throws IOException {
            HttpEntity entity = response.getEntity();

            if (entity != null) {
                JsonNode res = objectMapper.readTree(entity.getContent());
                assertNoError(res);
                return res;
            } else {
                return null;
            }
        }

        private void assertNoError(final JsonNode response) {
            final JsonNode errorNode = response.at("/error");
            if (!errorNode.isMissingNode()) {
                if (LOGGER.isInfoEnabled()) {
                    LOGGER.info("Received error response. Description: '{}'", errorNode.asText());
                }

                throw new DarkSkyApiException(errorNode.asText());
            }
        }
    };

    public Condition getCondition(Double latitude, Double longitude) {
        String url = requestUrl(String.format("%s,%s", latitude, longitude));

        Conditions conditions = parseConditionResponse(fetchResponse(url));

        return new Condition(
                conditions.getTempC()
        );
    }

    private JsonNode fetchResponse(String url) {
        HttpGet httpGet = new HttpGet(url);
        try {
            JsonNode response = httpClient.execute(httpGet, jsonNodeResponseHandler);
            LOGGER.debug("Received Dark Sky response: '{}'", response);

            return response;
        } catch (IOException e) {
            LOGGER.warn("Could not get response: {}", url, e);
            throw new DarkSkyApiException("Could not get response.");
        }
    }

    private Conditions parseConditionResponse(final JsonNode response) {
        JsonNode observation = response.at("/currently");

        return new Conditions(observation.at("/temperature").doubleValue());
    }

    private String requestUrl(String endpoint) {
        return String.format("%s/forecast/%s/%s?units=si&lang=en", properties.getBaseUrl(), properties.getApiKey(), endpoint);
    }
}
