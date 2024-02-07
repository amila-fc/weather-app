package com.sample.weatherservice.controller;

import com.sample.weatherservice.api.Condition;
import com.sample.weatherservice.client.darksky.DarkSkyApiClient;
import com.sample.weatherservice.client.darksky.DarkSkyApiException;
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
    private DarkSkyApiClient darkSkyApiClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getWeather_returnSuccessfully() throws Exception {

        // given
        when(darkSkyApiClient.getCondition(47.0, 8.0)).thenReturn(new Condition(26.1));

        // when+then
        this.mockMvc.perform(get("/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value("26.1"));
    }

    @Test
    void getWeather_darkSkyClient_throwsException() throws Exception {

        // given
        when(darkSkyApiClient.getCondition(47.0, 8.0)).thenThrow(new DarkSkyApiException("something went wrong"));

        // when+then
        this.mockMvc.perform(get("/weather")
                        .param("lat", "47.0")
                        .param("long", "8.0"))
                .andExpect(status().is5xxServerError());
    }
}