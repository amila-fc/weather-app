# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build Commands
```bash
# Build entire monorepo (frontend + backend)
./gradlew build

# Build only backend
./gradlew :backend:build

# Build only frontend
./gradlew :frontend:npmBuild

# Clean build
./gradlew clean build
```

### Test Commands
```bash
# Run all backend tests
./gradlew test

# Run single backend test
./gradlew test --tests "com.sample.weatherservice.controller.WeatherControllerTest.getWeather_returnSuccessfully"

# Frontend tests, type-checked build and lint (run from frontend/)
npm test          # vitest run (jsdom + Testing Library)
npm run build     # tsc && vite build
npm run lint      # eslint
```

### Run Application
```bash
# Run Spring Boot backend (includes frontend static files)
java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar

# Run with custom port
java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar --server.port=8081

# Run frontend development server (for development only)
./gradlew :frontend:npmDev
```

## Project Structure

This is a Gradle monorepo with Spring Boot backend and React frontend:

```
weather-app/
├── backend/                 # Spring Boot application
│   ├── build.gradle.kts    # Backend build configuration
│   └── src/
│       ├── main/java/com/sample/weatherservice/
│       │   ├── WeatherServiceApplication.java  # @EnableCaching
│       │   ├── controller/
│       │   │   ├── WeatherController.java      # REST endpoints
│       │   │   └── GlobalExceptionHandler.java # Error handling
│       │   ├── service/
│       │   │   ├── WeatherService.java         # Sets the cached flag, records history
│       │   │   ├── WeatherConditionLoader.java # @Cacheable aggregated fetch
│       │   │   ├── WeatherAggregationService.java # Concurrent providers, fallback, averaging
│       │   │   ├── WeatherHistoryService.java  # History write/read path
│       │   │   ├── TemperatureTrendAnalyzer.java # Least-squares trend classification
│       │   │   └── FrostWarningService.java    # Frost severity + advisory lookup
│       │   ├── entity/
│       │   │   └── WeatherRecord.java          # weather_history table
│       │   ├── repository/
│       │   │   └── WeatherRecordRepository.java # Spring Data JPA finder
│       │   ├── config/
│       │   │   ├── CacheConfig.java            # Caffeine cache manager
│       │   │   ├── WeatherCacheProperties.java # weather.cache.* binding
│       │   │   ├── WeatherProviderProperties.java # weather.primary/secondary/averaging binding
│       │   │   ├── WeatherHistoryProperties.java # weather.history.* binding
│       │   │   ├── CorsConfig.java
│       │   │   └── HttpClientConfig.java       # Per-provider HTTP clients + provider executor
│       │   ├── client/
│       │   │   ├── WeatherProvider.java        # fetch/source contract
│       │   │   ├── WeatherProviderException.java
│       │   │   ├── AllProvidersFailedException.java
│       │   │   ├── nws/
│       │   │   │   ├── NwsApiClient.java       # Weather API client
│       │   │   │   ├── NwsProperties.java      # Configuration
│       │   │   │   └── NwsApiException.java    # Custom exception
│       │   │   └── openmeteo/
│       │   │       └── OpenMeteoApiClient.java # Fallback provider + WMO code mapping
│       │   └── api/
│       │       ├── Condition.java             # Weather data model
│       │       ├── FrostSeverity.java         # none | light | moderate | severe
│       │       ├── FrostAssessment.java       # Frost fields derived from temperature
│       │       ├── WeatherSource.java         # nws | open-meteo | averaged
│       │       ├── TrendDirection.java        # up | down | stable
│       │       └── WeatherHistoryResponse.java # History window + trend
│       ├── main/resources/
│       │   ├── application.properties
│       │   └── messages.properties            # frost.advisory.* texts
│       └── test/
├── frontend/                # React application
│   ├── build.gradle.kts    # Frontend build configuration
│   ├── package.json        # NPM dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── src/
│       ├── App.tsx         # Main application component
│       ├── api/
│       │   ├── weatherClient.ts  # API client
│       │   └── weatherQuery.ts   # Shared ['weather', lat, lng] query options
│       ├── hooks/
│       │   ├── useComparisonLocations.ts  # Comparison set: cap, dedupe, validation
│       │   ├── useFavoriteCombinations.ts # localStorage favorites
│       │   ├── useAlerts.ts               # Session alert store (dedupe, unread count)
│       │   ├── useNotificationPreferences.ts # localStorage notification preferences
│       │   └── useWeatherWatch.ts         # 15-minute polling that raises alerts
│       ├── state/
│       │   └── ActiveLocationContext.tsx  # Active location shared by header and tab
│       ├── utils/
│       │   ├── temperature.ts    # Temperature bands
│       │   ├── coordinates.ts    # 4-dp rounding, validation, keys
│       │   ├── comparison.ts     # Warmest/coldest and humidity highlights
│       │   ├── alerts.ts         # Alert rules (frost, extremes, change) + ids
│       │   ├── browserNotifications.ts # Guarded Notification API wrapper
│       │   └── format.ts         # Humidity rounding, relative time
│       ├── test/
│       │   └── setup.ts          # Testing Library matchers for Vitest
│       └── components/
│           ├── App tabs: TabNav.tsx, CurrentWeatherTab.tsx, ComparisonTab.tsx
│           ├── WeatherDisplay.tsx # Weather display component
│           ├── WeatherMap.tsx     # Leaflet map, click-to-fetch, coloured markers
│           ├── WeatherPopup.tsx   # Map popup with loading/error states
│           ├── LocationPicker.tsx # lat/long form reused by both tabs
│           ├── ComparisonTable.tsx # Side-by-side table with per-column states
│           ├── NotificationBell.tsx # Bell + unread badge + panel toggle
│           ├── NotificationPanel.tsx # Alert list, mark all read, settings
│           └── NotificationSettings.tsx # Alert switches, thresholds, permission
├── build.gradle.kts        # Root build configuration
└── settings.gradle.kts     # Multi-module settings
```

## Architecture Details

### Backend (Spring Boot 3.3.6)
- **Framework**: Spring Boot 3.3.6 with Spring Web
- **Java Version**: 21, enforced by a Gradle Java toolchain in `backend/build.gradle.kts`
- **API Endpoints**:
  - `GET /api/status` - Server health check
  - `GET /api/weather?lat={latitude}&long={longitude}` - Get weather data
  - `GET /api/weather/history?lat={latitude}&long={longitude}&days={days}` - Recorded history + trend (`days` 1..30, default 7)
- **Weather API**: National Weather Service (api.weather.gov)
  - No API key required
  - Two-step process: coordinates → grid → weather data
  - Returns temperature (°F), humidity (%), description, apparent temperature, and forecast summary
- **Caching**: Caffeine-backed `weather` cache through the Spring Cache abstraction
  - `WeatherController` → `WeatherService` (sets the `cached` flag) → `WeatherConditionLoader` (`@Cacheable`) → `NwsApiClient`
  - Keyed by coordinates normalized to 4 decimals (`47.0000,8.0000`), matching the NWS `/points/%.4f,%.4f` lookup
  - TTL `weather.cache.ttl` (default `5m`) and bound `weather.cache.max-size` (default `1000`); non-positive values fail startup
  - Only successful responses are cached, and the cached value never carries `cached=true`
- **Frost assessment**: derived from `temperature`, never fetched
  - `FrostWarningService` buckets the temperature (inclusive lower bound): `none` (≥32°F), `light` (25–31.9°F), `moderate` (15–24.9°F), `severe` (<15°F)
  - `frost_warning` is `true` for every bucket except `none`
  - Advisory texts live only in `messages.properties` (`frost.advisory.<severity>`) and are resolved through `MessageSource`; a missing key throws `NoSuchMessageException`
- **Multi-provider integration**: NWS is primary, Open-Meteo is the fallback
  - `WeatherProvider` (`fetch`/`source`) is implemented by `NwsApiClient` and `OpenMeteoApiClient`; every provider failure is a `WeatherProviderException` (`NwsApiException` is a subtype)
  - `WeatherAggregationService` calls both providers concurrently on virtual threads: both answer → numeric fields averaged with NWS wording, `source=averaged`; one answers → that payload; none → `AllProvidersFailedException` → 503
  - A provider that fails is never waited on; a silent provider is abandoned at its own `weather.primary.timeout` / `weather.secondary.timeout` (default `2s`), which the HTTP clients also enforce
  - `weather.averaging.enabled=false` always prefers the NWS payload (`source=nws`); Open-Meteo base URL, user agent and both timeouts come from `application.properties`
- **History**: every successful `/api/weather` query writes one `weather_history` row (H2, in-memory)
  - `WeatherService` records after the `cached` flag is applied, so cache hits are recorded too and the column is truthful; a 503 writes nothing
  - Coordinates are stored at 4 decimals with the cache-key convention; the only access path is the `(latitude, longitude, recorded_at)` index
  - `GET /api/weather/history?lat=&long=&days=` returns ascending records for the window (default `7`, max `30`), plus a least-squares trend (`up`/`down`/`stable`) and `temperatureChange` in °F/day (threshold `weather.history.trend-threshold`)
  - Invalid `days` or missing coordinates → 400; H2 is ephemeral, so history is lost on restart
- **Exception Handling**: `GlobalExceptionHandler` is the only place mapping exceptions to status codes
  - `WeatherProviderException` → 503, invalid request parameters / bad `days` → 400
  - Unknown paths (`NoResourceFoundException`) → 404 and unsupported methods → 405, instead of falling through
    to the catch-all 500 handler; the catch-all stays for genuinely unexpected errors

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18.3 with TypeScript 5.5
- **Build Tool**: Vite 5.3
- **State Management**: TanStack Query v5 for server state
- **Map**: Leaflet 1.9 + react-leaflet 4 (pinned to v4 for React 18) with OpenStreetMap tiles — no API token
  - Chosen over Mapbox because Mapbox would need a secret token in the frontend bundle
  - One shared query key `['weather', lat, lng]` feeds the map popup, the marker colour and the display
- **Features**:
  - Real-time weather display
  - Interactive map: click anywhere to load that location, popup with the conditions, temperature-coloured
    markers; pins stop at 5 and the popup's "Compare these N locations" action (enabled from 2 pins) hands the
    pinned set to the comparison tab and switches to it
  - Comparison tab: up to 5 locations side by side, warmest/coldest and most/least humid marked with a text
    alternative, per-column loading/error isolation; saved combinations persist in `localStorage` under
    `weather-app:favorite-combinations:v1` (coordinates, name and timestamp only)
  - In-app tabs (`Current weather`, `Compare`) driven by `useState` and kept in `location.hash` — no router dependency
  - Notification bell in the top bar: checks the active location every 15 minutes and raises frost, extreme
    temperature and significant-change alerts, with an unread badge, a panel and per-type preferences persisted in
    `weather-app:notification-preferences:v1` (thresholds included; nothing else is stored)
  - Browser notifications are opt-in from the settings panel (permission is only requested from that click) and use
    the alert id as the toast `tag`; with permission denied or unsupported the alerts still list in-app
  - Known limitation: the watch is polling, not push — with the tab closed nothing fires (no service worker)
  - Frost warning alerts (temperature < 32°F)
  - Manual coordinate entry or browser geolocation
  - Auto-refresh capability
- **Theming**: design tokens only — every colour lives in `src/index.css` as a CSS custom property
  (`--color-bg/surface/text/text-muted/accent/border/focus/danger/band-*/highlight-*`), switched by
  `:root[data-theme='dark']`; components never hardcode a colour
  - Mode is `light | dark | system` (default `system`), owned by `theme/ThemeProvider.tsx` + `hooks/useTheme.ts`,
    toggled light → dark → system by `components/ThemeToggle.tsx` and persisted in `weather-app:theme:v1`
    (corrupt value → `system`); `system` subscribes to `matchMedia('(prefers-color-scheme: dark)')`
  - Both themes declare `color-scheme`, and `frontend/index.html` carries a tiny pre-paint script that sets
    `data-theme` from storage before the bundle runs, so there is no flash of the wrong theme
  - Contrast pairs are documented next to the tokens in `index.css` (body text ≥ 4.5:1, borders/focus/UI
    boundaries ≥ 3:1, measured, not eyeballed)
- **Layout**: `#root` is a plain block container (`max-width: 1280px`), not a centred flex body
  - Breakpoints `640 / 900 / 1200px`; `.current-tab` is one column below 900px and map + form + weather panel
    from 900px, `.compare-tab` becomes a sidebar + table layout from 900px
  - Fluid sizing via `clamp()` (map height, section padding, heading size); every control keeps a 44×44 target
    (`--target-min`, including Leaflet's zoom buttons), and the comparison table scrolls inside its own
    `position: relative` wrapper with a sticky metric column so the page itself never scrolls sideways
- **Accessibility**: skip link → `<main id="main">`; one `h1`; `header` / `nav` / `main` landmarks; WAI-ARIA
  tabs in `TabNav` (roving tabindex + `ArrowLeft`/`ArrowRight`/`Home`/`End`); the notification panel is an
  `aria-modal` dialog with initial focus, a Tab trap and Escape returning focus to the bell; form errors are
  `role="alert"` and wired with `aria-describedby`; `aria-live` announces the refreshed temperature, the unread
  alert count and the active view; `:focus-visible` rings use `--color-focus`
- **Loading and failure states**: `components/Skeleton.tsx` (`SkeletonBlock`/`SkeletonText`) replaces the old
  spinners in `WeatherDisplay`, `WeatherPopup` and the comparison cells; loading containers are `aria-busy="true"`
  with screen-reader-only "Loading…" text, and the shimmer/pulse/fly-to easing stop under
  `prefers-reduced-motion: reduce`
  - `components/ErrorBoundary.tsx` wraps the whole app (`main.tsx`) and each tab, so a render error shows a
    `role="alert"` fallback with Try again / Reload while the header, tabs and the other tab keep working; it logs
    only the error name, never payloads
  - Query failures render human-readable copy with Retry through the same fallback pattern
- **API Integration**: Proxy configuration to backend (`/api` → `http://localhost:8080`)

### Gradle Configuration
- **Version**: Gradle 9.3.0 wrapper
- **Node Plugin**: com.github.node-gradle.node v7.1.0
- **Node/NPM**: Automatically downloads Node 20.11.0 and NPM 10.2.4
- **Java Toolchain**: Gradle auto-provisions a JDK 21 (via the foojay resolver in `settings.gradle.kts`) and runs compilation and tests on it, so the host JDK version does not affect the build. The JDK is downloaded once on the first build (~1 min) and cached under `~/.gradle/jdks`.
- **Build Integration**: Frontend build outputs to `frontend/dist/`, copied to backend's static resources

## Development Workflow

### Local Development
1. Backend runs on port 8080 (or specify with `--server.port`)
2. Frontend dev server runs on port 3000 with hot reload
3. Frontend proxies API calls to backend

### Production Build
1. `./gradlew build` builds both frontend and backend
2. Frontend assets are bundled into the Spring Boot JAR
3. Single JAR deployment with embedded frontend

## API Integration Details

### National Weather Service API
- **Base URL**: https://api.weather.gov
- **Authentication**: None required, but User-Agent header must be set
- **Rate Limiting**: Reasonable use allowed (no specific limits)
- **Coverage**: United States territories only
- **Data Flow**:
  1. Call `/points/{lat},{long}` to get grid coordinates
  2. Get observation stations from the grid
  3. Fetch latest observations from nearest station
  4. Get forecast data for additional information

### Open-Meteo API (fallback / averaging partner)
- **Base URL**: `weather.secondary.base-url` (default https://api.open-meteo.com/v1/forecast)
- **Authentication**: none; `weather.secondary.user-agent` is sent as the User-Agent
- **Request**: `?latitude={lat}&longitude={long}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit&timezone=UTC`
- `temperature_unit=fahrenheit` keeps the °F contract; WMO `weather_code` is mapped to `description`
- Global coverage, so it also serves locations the NWS cannot

### Response Format
```json
{
  "temperature": 55.796,           // Fahrenheit
  "humidity": 67.995,              // Percentage
  "description": "Clear",          // Current conditions
  "apparentTemperature": 55.796,   // Feels like (°F)
  "summary": "Clear skies...",     // Detailed forecast
  "cached": false,                 // true when served from the weather cache
  "source": "averaged",            // nws | open-meteo | averaged
  "frost_warning": false,          // true when frost is expected (severity != none)
  "frost_severity": "none",        // none | light | moderate | severe
  "frost_advisory": "No frost..."  // from messages.properties: frost.advisory.<severity>
}
```

### History Response Format (`GET /api/weather/history`)
```json
{
  "latitude": 47.0000,             // normalized to 4 decimals
  "longitude": 8.0000,
  "days": 3,                       // requested window
  "records": [                     // ascending by recordedAt
    {
      "recordedAt": "2026-10-29T10:00:00Z",  // UTC
      "temperature": 55.796,
      "humidity": 67.995,
      "apparentTemperature": 55.796,
      "description": "Clear",
      "summary": "Clear skies...",
      "source": "nws",             // nws | open-meteo | averaged
      "cached": false              // was this query served from cache
    }
  ],
  "trend": "up",                   // up | down | stable (least-squares slope)
  "temperatureChange": 1.25        // °F per day
}
```

## Testing

- **Backend Tests**: JUnit 5 with Spring Boot Test
- **Mocking**: Mockito for external API calls
- **Test Coverage**: Controller endpoints with success and error cases, cache hit/miss/expiry/keying
  (`WeatherServiceTest` uses an injected Caffeine `Ticker` as a fake clock, so no `Thread.sleep`)
- **Cache config tests**: `CacheConfigTest` covers property binding, bounds, stats and startup validation
- **Frost tests**: `FrostWarningServiceTest` covers every bucket and the `32.0`/`25.0`/`15.0` boundaries,
  `FrostSeverityTest` asserts wire values and message-bundle presence, `WeatherControllerTest` asserts the JSON contract
- **Frontend tests**: Vitest + jsdom + Testing Library (`npm test`); `temperature.test.ts` covers every band
  boundary, `WeatherMap.test.tsx` mocks `react-leaflet` (no tiles or layout in jsdom), `WeatherPopup.test.tsx`
  covers loading/success/error+retry, `App.test.tsx` asserts a click becomes one request for the rounded point,
  and the comparison tab is covered by `coordinates`/`comparison`/`useComparisonLocations`/`useFavoriteCombinations`
  plus `ComparisonTable` and `ComparisonTab` tests
- **Alert tests**: `alerts.test.ts` (frost fallback, extreme boundaries, change threshold, id stability),
  `useWeatherWatch.test.tsx` (fake timers for the 15-minute poll), `useAlerts`, `useNotificationPreferences`,
  `browserNotifications`, `NotificationBell` and `NotificationPanel` — all with a stubbed `Notification` object
- **Theme/layout/a11y tests**: `ThemeProvider.test.tsx` (system default, live `matchMedia` switch, persistence,
  corrupt value), `ThemeToggle.test.tsx` (light → dark → system labels and `aria-pressed`), `ErrorBoundary.test.tsx`
  (fallback, reset, no payload in the log), `Skeleton.test.tsx`, `TabNav.test.tsx` (roving tabindex, arrows, Home/End),
  and `a11y.test.tsx` which runs `vitest-axe` over App, `ComparisonTab` and `NotificationPanel` in **both** themes
  (zero violations). `test/renderWithProviders.tsx` mirrors the providers from `main.tsx`, and
  `test/setup.ts` registers the axe matcher plus the per-test storage/timer/global resets
- **Provider tests**: `WeatherAggregationServiceTest` covers both-healthy, fail-fast fallback, primary/secondary
  timeouts and both-fail using latches (no `Thread.sleep`); `OpenMeteoApiClientTest` covers °F mapping and WMO codes
- **History tests**: `WeatherRecordRepositoryTest` (`@DataJpaTest`) verifies the derived finder, `WeatherHistoryServiceTest`
  covers persistence, windowing and trend wiring, `TemperatureTrendAnalyzerTest` covers up/down/stable/no-data,
  `WeatherServiceTest` asserts one row per successful query (including cache hits) and none on failure

## Important Notes

- The application previously used Dark Sky API (deprecated)
- Successfully migrated to National Weather Service API
- Frontend includes frost warning feature (displays alert when temp < 32°F); the backend now also exposes authoritative `frost_warning` / `frost_severity` / `frost_advisory` fields
- CORS enabled for development profile
- All weather data is for US locations only (NWS limitation)
