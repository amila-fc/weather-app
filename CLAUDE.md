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
# Run all tests
./gradlew test

# Run single test
./gradlew test --tests "com.sample.weatherservice.controller.WeatherControllerTest.getWeather_returnSuccessfully"
```

### Run Application
```bash
# Run Spring Boot backend (includes frontend static files)
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar

# Run with custom port
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar --server.port=8081

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
│       │   ├── WeatherServiceApplication.java
│       │   ├── controller/
│       │   │   ├── WeatherController.java      # REST endpoints
│       │   │   └── GlobalExceptionHandler.java # Error handling
│       │   ├── client/nws/
│       │   │   ├── NwsApiClient.java          # Weather API client
│       │   │   ├── NwsProperties.java         # Configuration
│       │   │   └── NwsApiException.java       # Custom exception
│       │   └── api/
│       │       └── Condition.java             # Weather data model
│       └── test/
├── frontend/                # React application
│   ├── build.gradle.kts    # Frontend build configuration
│   ├── package.json        # NPM dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── src/
│       ├── App.tsx         # Main application component
│       ├── api/
│       │   └── weatherClient.ts  # API client
│       └── components/
│           └── WeatherDisplay.tsx # Weather display component
├── build.gradle.kts        # Root build configuration
└── settings.gradle.kts     # Multi-module settings
```

## Architecture Details

### Backend (Spring Boot 3.3.6)
- **Framework**: Spring Boot 3.3.6 with Spring Web
- **Java Version**: 21 (configured in build.gradle.kts)
- **API Endpoints**:
  - `GET /api/status` - Server health check
  - `GET /api/weather?lat={latitude}&long={longitude}` - Get weather data
- **Weather API**: National Weather Service (api.weather.gov)
  - No API key required
  - Two-step process: coordinates → grid → weather data
  - Returns temperature (°F), humidity (%), description, apparent temperature, and forecast summary
- **Exception Handling**: Global exception handler for API errors (returns 503 for NWS failures)

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18.3 with TypeScript 5.5
- **Build Tool**: Vite 5.3
- **State Management**: TanStack Query v5 for server state
- **Features**:
  - Real-time weather display
  - Frost warning alerts (temperature < 32°F)
  - Manual coordinate entry or browser geolocation
  - Auto-refresh capability
- **API Integration**: Proxy configuration to backend (`/api` → `http://localhost:8080`)

### Gradle Configuration
- **Version**: Gradle 9.3.0 wrapper
- **Node Plugin**: com.github.node-gradle.node v7.1.0
- **Node/NPM**: Automatically downloads Node 20.11.0 and NPM 10.2.4
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

### Response Format
```json
{
  "temperature": 55.796,           // Fahrenheit
  "humidity": 67.995,              // Percentage
  "description": "Clear",          // Current conditions
  "apparentTemperature": 55.796,   // Feels like (°F)
  "summary": "Clear skies..."      // Detailed forecast
}
```

## Testing

- **Backend Tests**: JUnit 5 with Spring Boot Test
- **Mocking**: Mockito for external API calls
- **Test Coverage**: Controller endpoints with success and error cases

## Important Notes

- The application previously used Dark Sky API (deprecated)
- Successfully migrated to National Weather Service API
- Frontend includes frost warning feature (displays alert when temp < 32°F)
- CORS enabled for development profile
- All weather data is for US locations only (NWS limitation)
