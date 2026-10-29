package com.sample.weatherservice.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Guards the OpenAPI contract of {@link WeatherController}.
 *
 * <p>The document is generated from the controller annotations, so these tests assert that the contract says
 * what the controller actually does, and that the committed copy in {@code docs/openapi.json} does not drift
 * from the generated one.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractTest {

    private static final String CONTRACT_RESOURCE = "docs/openapi.json";

    private static final String ERROR_SCHEMA = "#/components/schemas/ErrorResponse";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private JsonNode generatedDocument;

    @Test
    void generatedDocument_matchesCommittedContract() throws Exception {
        // given
        final JsonNode generated = document();

        // when
        final JsonNode committed = objectMapper.readTree(Files.readString(contractPath(), StandardCharsets.UTF_8));

        // then
        assertSameJson(committed, generated, "$");
    }

    @Test
    void generatedDocument_listsEveryControllerEndpoint() throws Exception {
        // given
        final JsonNode paths = document().path("paths");

        // when
        final Set<String> documented = new LinkedHashSet<>(iterable(() -> paths.fieldNames()));

        // then
        assertThat(documented)
                .containsExactlyInAnyOrder("/api/status", "/api/weather", "/api/weather/history",
                        "/api/weather/trends");
    }

    @Test
    void weatherOperation_documentsBothCoordinatesAsRequiredNumbers() throws Exception {
        // given
        final JsonNode parameters = getOperation("/api/weather").path("parameters");

        // when+then
        assertThat(parameterNames(parameters)).containsExactly("lat", "long");
        for (String name : List.of("lat", "long")) {
            final JsonNode parameter = parameter(parameters, name);
            assertThat(parameter.path("in").asText()).isEqualTo("query");
            assertThat(parameter.path("required").asBoolean()).isTrue();
            assertThat(parameter.path("schema").path("type").asText()).isEqualTo("number");
        }
    }

    @Test
    void weatherOperation_documentsSuccessAndProviderFailureResponses() throws Exception {
        // given
        final JsonNode responses = getOperation("/api/weather").path("responses");

        // when+then
        assertThat(responseCodes(responses)).containsExactlyInAnyOrder("200", "400", "503");
        assertThat(schemaRef(responses.path("200"))).isEqualTo("#/components/schemas/Condition");
        assertThat(schemaRef(responses.path("400"))).isEqualTo(ERROR_SCHEMA);
        assertThat(schemaRef(responses.path("503"))).isEqualTo(ERROR_SCHEMA);
    }

    @Test
    void windowParameters_documentedAsOptionalIntegers() throws Exception {
        // given
        final JsonNode historyParameters = getOperation("/api/weather/history").path("parameters");
        final JsonNode trendsParameters = getOperation("/api/weather/trends").path("parameters");

        // when+then
        assertThat(parameterNames(historyParameters)).containsExactly("lat", "long", "days");
        assertThat(parameter(historyParameters, "days").path("required").asBoolean()).isFalse();
        assertThat(parameter(historyParameters, "days").path("schema").path("type").asText()).isEqualTo("integer");

        assertThat(parameterNames(trendsParameters)).containsExactly("lat", "long", "hours");
        assertThat(parameter(trendsParameters, "hours").path("required").asBoolean()).isFalse();
        assertThat(parameter(trendsParameters, "hours").path("schema").path("type").asText()).isEqualTo("integer");
    }

    @Test
    void windowEndpoints_documentRejectedWindowAsBadRequest() throws Exception {
        // given
        final JsonNode historyResponses = getOperation("/api/weather/history").path("responses");
        final JsonNode trendsResponses = getOperation("/api/weather/trends").path("responses");

        // when+then
        assertThat(responseCodes(historyResponses)).containsExactlyInAnyOrder("200", "400");
        assertThat(responseCodes(trendsResponses)).containsExactlyInAnyOrder("200", "400");
        assertThat(schemaRef(historyResponses.path("400"))).isEqualTo(ERROR_SCHEMA);
        assertThat(schemaRef(trendsResponses.path("400"))).isEqualTo(ERROR_SCHEMA);
    }

    @Test
    void conditionSchema_documentsTheWireNamesAndEnumValues() throws Exception {
        // given
        final JsonNode properties = document().path("components").path("schemas").path("Condition").path("properties");

        // when+then
        assertThat(iterable(() -> properties.fieldNames()))
                .contains("temperature", "humidity", "apparentTemperature", "description", "summary", "cached",
                        "frost_warning", "frost_severity", "frost_advisory", "source");
        assertThat(texts(properties.path("source").path("enum"))).containsExactly("nws", "open-meteo", "averaged");
        assertThat(texts(properties.path("frost_severity").path("enum")))
                .containsExactly("none", "light", "moderate", "severe");
        assertThat(properties.path("frost_warning").path("type").asText()).isEqualTo("boolean");
    }

    @Test
    void historySchema_documentsTheTrendEnumValues() throws Exception {
        // given
        final JsonNode schemas = document().path("components").path("schemas");

        // when+then
        assertThat(iterable(() -> schemas.path("WeatherHistoryResponse").path("properties").fieldNames()))
                .containsExactly("latitude", "longitude", "days", "records", "trend", "temperatureChange");
        assertThat(texts(schemas.path("WeatherHistoryResponse").path("properties").path("trend").path("enum")))
                .containsExactly("up", "down", "stable");
        assertThat(iterable(() -> schemas.path("Entry").path("properties").fieldNames()))
                .containsExactly("recordedAt", "temperature", "humidity", "apparentTemperature", "description",
                        "summary", "source", "cached");
    }

    @Test
    void statusOperation_producesPlainText() throws Exception {
        // given
        final JsonNode responses = getOperation("/api/status").path("responses");

        // when+then
        assertThat(responseCodes(responses)).containsExactly("200");
        assertThat(iterable(() -> responses.path("200").path("content").fieldNames())).containsExactly("text/plain");
    }

    private JsonNode document() throws Exception {
        if (generatedDocument == null) {
            final String body = mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString(StandardCharsets.UTF_8);
            generatedDocument = objectMapper.readTree(body);
        }
        return generatedDocument;
    }

    private JsonNode getOperation(String path) throws Exception {
        final JsonNode operation = document().path("paths").path(path).path("get");
        assertThat(operation.isMissingNode())
                .as("GET %s is missing from the OpenAPI contract", path)
                .isFalse();
        return operation;
    }

    private static String schemaRef(JsonNode response) {
        return iterable(() -> response.path("content").elements()).isEmpty()
                ? ""
                : response.path("content").elements().next().path("schema").path("$ref").asText();
    }

    private static List<String> parameterNames(JsonNode parameters) {
        final List<String> names = new ArrayList<>();
        parameters.forEach(parameter -> names.add(parameter.path("name").asText()));
        return names;
    }

    private static JsonNode parameter(JsonNode parameters, String name) {
        return iterable(() -> parameters.elements()).stream()
                .filter(candidate -> name.equals(candidate.path("name").asText()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("parameter " + name + " is missing from the contract"));
    }

    private static Set<String> responseCodes(JsonNode responses) {
        return new LinkedHashSet<>(iterable(() -> responses.fieldNames()));
    }

    private static Path contractPath() {
        Path directory = Path.of("").toAbsolutePath();
        while (directory != null) {
            final Path candidate = directory.resolve(CONTRACT_RESOURCE);
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
            directory = directory.getParent();
        }
        throw new IllegalStateException(
                CONTRACT_RESOURCE + " not found above " + Path.of("").toAbsolutePath()
                        + "; regenerate it from GET /v3/api-docs");
    }

    private static <T> List<T> iterable(Supplier<Iterator<T>> supplier) {
        final List<T> values = new ArrayList<>();
        supplier.get().forEachRemaining(values::add);
        return values;
    }

    private static List<String> texts(JsonNode array) {
        final List<String> values = new ArrayList<>();
        array.forEach(element -> values.add(element.asText()));
        return values;
    }

    /**
     * Compares two JSON trees. Object keys are compared as a set and numbers by value, so the committed file
     * may be formatted differently (or write {@code 47} where the generator writes {@code 47.0}) without
     * masking a real contract change.
     */
    private static void assertSameJson(JsonNode expected, JsonNode actual, String pointer) {
        if (expected.isNumber() && actual.isNumber()) {
            final BigDecimal expectedNumber = expected.decimalValue();
            assertThat(actual.decimalValue())
                    .as("%s: number", pointer)
                    .isEqualByComparingTo(expectedNumber);
            return;
        }
        if (expected.isObject() && actual.isObject()) {
            assertThat(new LinkedHashSet<>(iterable(actual::fieldNames)))
                    .as("%s: property names", pointer)
                    .isEqualTo(new LinkedHashSet<>(iterable(expected::fieldNames)));
            expected.fieldNames().forEachRemaining(name ->
                    assertSameJson(expected.get(name), actual.get(name), pointer + "." + name));
            return;
        }
        if (expected.isArray() && actual.isArray()) {
            assertThat(actual.size()).as("%s: array length", pointer).isEqualTo(expected.size());
            for (int index = 0; index < expected.size(); index++) {
                assertSameJson(expected.get(index), actual.get(index), pointer + "[" + index + "]");
            }
            return;
        }
        assertThat(actual).as("%s: value", pointer).isEqualTo(expected);
    }
}
