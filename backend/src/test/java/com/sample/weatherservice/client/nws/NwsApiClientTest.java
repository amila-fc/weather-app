package com.sample.weatherservice.client.nws;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.api.WeatherSource;
import org.apache.http.impl.client.HttpClientBuilder;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
