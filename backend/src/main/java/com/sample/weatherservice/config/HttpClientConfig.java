package com.sample.weatherservice.config;

import org.apache.http.client.HttpClient;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.impl.client.HttpClientBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class HttpClientConfig {
    @Bean
    public HttpClient getHttpClient() {
        final int connectionTimeoutMilliseconds = 2 * 1000;
        final RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(connectionTimeoutMilliseconds)
                .setConnectionRequestTimeout(connectionTimeoutMilliseconds)
                .setSocketTimeout(connectionTimeoutMilliseconds)
                .build();

        return HttpClientBuilder.create()
                .setUserAgent("sample-weather-service")
                .setConnectionTimeToLive(500, TimeUnit.MILLISECONDS)
                .setMaxConnTotal(1024)
                .setMaxConnPerRoute(1024)
                .disableAutomaticRetries()
                .setDefaultRequestConfig(config)
                .build();
    }
}
