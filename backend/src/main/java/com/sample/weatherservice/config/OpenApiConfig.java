package com.sample.weatherservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Publishes the OpenAPI 3 contract of the REST layer.
 *
 * <p>The document is assembled from the Spring MVC mappings plus the springdoc annotations on the
 * controllers, so it cannot drift from the code. It is served at {@code springdoc.api-docs.path}
 * ({@code /v3/api-docs}) with the interactive UI at {@code springdoc.swagger-ui.path}
 * ({@code /swagger-ui.html}). The committed copy under {@code docs/openapi.json} is verified against the
 * generated document by {@code OpenApiContractTest}.
 */
@Configuration
public class OpenApiConfig {

    private static final String API_TITLE = "Weather Service API";

    /** Mirrors the artifact version in {@code build.gradle.kts}. */
    private static final String API_VERSION = "0.0.1-SNAPSHOT";

    private static final String SERVER_DESCRIPTION = "The origin this API is served from";

    private static final String API_DESCRIPTION = """
            Current conditions, recorded history and the 24-hour trends series.

            Temperatures are degrees Fahrenheit, humidity is a percentage, and wind direction is the bearing the
            wind blows from, clockwise from north. A 400 means the request itself was invalid (a missing or
            non-numeric coordinate, or a window outside the configured bounds); a 503 means every upstream
            provider failed, in which case nothing is recorded in the history.""";

    @Bean
    public OpenAPI weatherServiceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title(API_TITLE)
                        .version(API_VERSION)
                        .description(API_DESCRIPTION))
                // A relative server keeps the contract host-agnostic; without this springdoc would bake the
                // host and port of whichever request generated the document into it.
                .servers(List.of(new Server().url("/").description(SERVER_DESCRIPTION)));
    }
}
