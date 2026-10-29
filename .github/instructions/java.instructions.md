---
description: "Use when writing, modifying, or reviewing Java code: Spring Boot controllers, services, HTTP clients, DTOs, exception handlers, and JUnit 5 tests in the backend module."
applyTo: "**/*.java"
---
# Java Coding Rules

Applies to `backend/` (Java 21, Spring Boot 3.3.6, Gradle Kotlin DSL, package `com.sample.weatherservice`).
There is no formatter or static-analysis plugin configured — these rules are the substitute, so follow them by hand.

## Style

- 4-space indentation, no tabs, max line length 120.
- One public top-level type per file; file name must match the public type name.
- Keep member order: static constants, instance fields, constructors, public methods, private helpers.
- Use `final` on method parameters and on fields that are set only by the constructor.
- Always use braces for `if`/`for`/`while`, even for one statement.
- Prefer early returns over nested `if`/`else` blocks; keep methods under ~40 lines.
- Comment only what the code cannot express (why, not what). No commented-out code.

## Naming

- `camelCase` methods/fields, `PascalCase` types, `UPPER_SNAKE_CASE` static constants.
- Booleans read as predicates: `isExpired`, `hasValue` — not `flag` or `status2`.
- Test names: `methodOrBehavior_condition_expectedResult` (e.g. `getWeather_nwsClient_throwsException`).
- Domain model names describe the API contract (`Condition`, `NwsApiException`), not the framework.

## Modern Java 21

- Use `record` for new immutable value/DTO types; keep existing mutable classes (`Condition`) unchanged unless the task requires migrating them.
- Use `switch` expressions with pattern matching instead of `if`/`else if` chains on type or enum checks.
- Use `var` only for locals where the type is obvious from the initializer; never for fields, parameters, or returns.
- Use text blocks for multi-line literals; use `String.format`/`formatted` for URL and message construction.
- Never rely on integer division in arithmetic: write `tempC * 9.0 / 5.0 + 32`, not `tempC * 9 / 5 + 32`.
- Prefer `List.of`/`Map.of` for immutable collections; never return `null` for a collection — return an empty one.

## Spring Boot

- Constructor injection only. No `@Autowired` on fields.
- Controllers stay thin: bind input, delegate, return. Business logic and I/O live in `@Service`/client classes.
- Configure via `@ConfigurationProperties` classes (`NwsProperties`) bound in `application.properties`. Never hardcode URLs, hosts, or user agents in code.
- Declare beans (`HttpClient`, `ObjectMapper`) in `config/` classes; inject them rather than constructing new instances.
- Keep `@RestControllerAdvice` as the single place that maps exceptions to HTTP status; controllers do not catch to build responses.
- Annotate request params explicitly with the external name: `@RequestParam("lat") double latitude`.
- Validate user input at the boundary: coordinates must satisfy -90 ≤ lat ≤ 90 and -180 ≤ long ≤ 180. Reject invalid input with a 400, not a downstream 503.
- Do not add `@CrossOrigin` to controllers; CORS belongs to `CorsConfig`.

## External API calls

- Set `User-Agent` and `Accept` headers on every NWS request; the API rejects requests without them.
- Treat missing/`null` JSON nodes as a data problem: check `isNumber()`/`isTextual()` before `asDouble()`/`asText()`, and fail with a domain exception rather than substituting `0.0` or `""`.
- Wrap low-level `IOException` in a domain exception (`NwsApiException`) and keep the cause: `new NwsApiException("...", e)`.
- Log the failing URL/coordinates; never log full response payloads at `INFO` or above.

## Error handling & logging

- Throw specific exceptions from the domain (`NwsApiException`), not `RuntimeException` or `IllegalStateException`, for expected failures.
- Never swallow exceptions: no empty `catch` blocks.
- Do not log and rethrow the same exception at the same layer (avoids duplicate stack traces).
- SLF4J parameterized logging only: `LOGGER.warn("Could not reach {}", url, e)`. No string concatenation, no `System.out`.
- Never put secrets, tokens, or full request/response bodies in logs or exception messages.
- Return user-safe messages to clients; keep internal detail in the server log only.

## Nulls, immutability, equals

- Use `Objects.requireNonNull` for mandatory constructor arguments; fail fast at construction.
- Prefer `Optional` for return types that can be legitimately absent; never for fields or parameters.
- Prefer unmodifiable state; add setters only where a framework (properties binding, Jackson) requires them.
- Override `equals`/`hashCode`/`toString` for value types, or make them records.

## Tests

- JUnit 5 + Mockito + `MockMvc`, mirroring `src/test/java/.../<ClassName>Test.java`.
- Structure with `// given`, `// when`, `// then`. One behavior per test.
- Mock the external boundary (`NwsApiClient`), never the class under test; no real network calls in tests.
- Cover the success path, the error path, and one boundary/invalid-input case for every new endpoint or branch.
- Assert on response body and status, not just `isOk()`; use `jsonPath` for payload fields.
- Keep `@MockBean` on Boot 3.3.x; switch to `@MockitoBean` only when the Boot version is upgraded.

## Dependencies & build

- Add a dependency only when the JDK or an existing dependency cannot do the job; prefer Spring Boot managed versions over pinned ones.
- Do not introduce Lombok, MapStruct, or other code generators without explicit approval.
- Do not change the `group`, `version`, or Java target (21) unless the task asks for it.
- Keep the Java target as a Gradle `toolchain` block, not `sourceCompatibility`/`targetCompatibility`: the toolchain also selects the JDK that compiles and runs tests, which `sourceCompatibility` does not.
- Keep backend code independent of `frontend/`; the only coupling is the static-file copy in `processResources`.

## Done criteria

- Code compiles: `./gradlew :backend:compileJava`.
- Tests pass: `./gradlew :backend:test` (or `--tests "com.sample.weatherservice.<Class>"` for a focused run).
- New or changed behavior has a test; existing tests are not weakened or deleted to make a build pass.
- No new `TODO`, `System.out`, dead code, or commented-out blocks.
