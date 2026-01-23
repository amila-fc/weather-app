# Weather Service Application

A full-stack weather application with Spring Boot backend and React frontend that provides real-time weather information using the National Weather Service API.

## Coding Exercises

**See [EXERCISE.md](EXERCISE.md) for coding challenges including:**
- Backend exercises (caching, multiple weather services, historical data)
- Frontend exercises (map visualization, comparison tools, notifications)
- Full-stack exercises (user preferences, data export, monitoring)
- Advanced challenges (predictions, i18n, real-time updates)

## Quick Start

### Prerequisites
- Java 21
- Node.js 20+ (auto-installed by Gradle)
- Gradle 9.3+ (use the included wrapper)

### Building & Running

#### Option 1: Using Gradle Wrapper (Recommended)

```bash
# Build the entire application (frontend + backend)
./gradlew build

# Run the Spring Boot application (includes frontend)
./gradlew :backend:bootRun

# Or run with the JAR file
java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar
```

#### Option 2: Development Mode

```bash
# Terminal 1: Run backend
./gradlew :backend:bootRun

# Terminal 2: Run frontend dev server (with hot reload)
./gradlew :frontend:npmDev
```

### Accessing the Application

- **Application**: http://localhost:8080
- **API Status**: http://localhost:8080/api/status
- **Weather API**: http://localhost:8080/api/weather?lat=40.7128&long=-74.0060

## Project Structure

```
weather-app/
├── backend/                 # Spring Boot application
│   └── src/
│       ├── main/java/      # Java source code
│       └── test/            # Unit tests
├── frontend/                # React application
│   └── src/
│       ├── api/            # API client
│       └── components/     # React components
├── EXERCISE.md             # Coding challenges
├── CLAUDE.md              # AI assistant instructions
└── build.gradle.kts       # Root build configuration
```

## Technology Stack

### Backend
- Spring Boot 3.3.6
- Java 21
- National Weather Service API (no API key required)
- Gradle build system

### Frontend
- React 18.3 with TypeScript
- Vite build tool
- TanStack Query for data fetching
- Tailwind CSS for styling

## API Documentation

### Endpoints

#### `GET /api/status`
Health check endpoint
- **Response**: `"Server is running."`

#### `GET /api/weather`
Get current weather data
- **Parameters**:
  - `lat` (required): Latitude
  - `long` (required): Longitude
- **Response**:
```json
{
  "temperature": 55.796,
  "humidity": 67.995,
  "description": "Clear",
  "apparentTemperature": 55.796,
  "summary": "Clear skies..."
}
```

## Testing

```bash
# Run all tests
./gradlew test

# Run specific test
./gradlew test --tests "com.sample.weatherservice.controller.WeatherControllerTest"
```

## Building for Production

```bash
# Clean build
./gradlew clean build

# The JAR file includes the frontend assets
# Deploy: backend/build/libs/backend-0.0.1-SNAPSHOT.jar
```

## Getting Started with Exercises

1. Review the exercises in [EXERCISE.md](EXERCISE.md)
2. Choose a story to implement
3. Create a new branch for your work
4. Run tests to verify your implementation
5. Submit your solution

## License

This project is available for educational purposes.