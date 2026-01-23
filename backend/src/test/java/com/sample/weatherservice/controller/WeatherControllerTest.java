package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.client.nws.NwsApiClient;
import com.sample.weatherservice.client.nws.NwsApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WeatherControllerTest {

    @MockBean
    private NwsApiClient nwsApiClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getWeather_returnSuccessfully() throws Exception {

        // given
        when(nwsApiClient.getCondition(47.0, 8.0)).thenReturn(
            new Condition(78.5, 65.0, "Clear", 76.0, "Clear skies with warm temperatures"));

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(78.5))
                .andExpect(jsonPath("$.humidity").value(65.0))
                .andExpect(jsonPath("$.description").value("Clear"))
                .andExpect(jsonPath("$.apparentTemperature").value(76.0))
                .andExpect(jsonPath("$.summary").value("Clear skies with warm temperatures"));
    }

    @Test
    void getWeather_nwsClient_throwsException() throws Exception {

        // given
        when(nwsApiClient.getCondition(47.0, 8.0)).thenThrow(new NwsApiException("Service unavailable"));

        // when+then
        this.mockMvc.perform(get("/api/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().is5xxServerError());
    }
}