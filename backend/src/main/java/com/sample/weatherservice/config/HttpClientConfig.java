package com.sample.weatherservice.config;

import org.apache.http.client.HttpClient;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.impl.client.HttpClientBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableConfigurationProperties(WeatherProviderProperties.class)
public class HttpClientConfig {

    @Bean
    public HttpClient nwsHttpClient(final WeatherProviderProperties properties) {
        return buildHttpClient(properties.getPrimary().getTimeout());
    }

    @Bean
    public HttpClient openMeteoHttpClient(final WeatherProviderProperties properties) {
        return buildHttpClient(properties.getSecondary().getTimeout());
    }

    @Bean(destroyMethod = "close")
    public ExecutorService weatherProviderExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    private static HttpClient buildHttpClient(final Duration timeout) {
        // The provider timeout is enforced by the client itself, so an abandoned call still stops at the socket.
        final int timeoutMilliseconds = (int) timeout.toMillis();
        final RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(timeoutMilliseconds)
                .setConnectionRequestTimeout(timeoutMilliseconds)
                .setSocketTimeout(timeoutMilliseconds)
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
