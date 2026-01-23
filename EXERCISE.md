# Coding Exercise

General Notes:
- There might be some bugs in the provided codebase. If you find them, add a `FIXME` or fix them.
- Should you encounter something that you don't entirely approve (or even just have some comment about) - don't be shy, flag the place and add a comment.
- The application currently uses the National Weather Service API (already implemented).
- Tests can be run with `./gradlew test`
- Build the entire app with `./gradlew build`
- Run the backend with `java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar`
- Run the frontend dev server with `./gradlew :frontend:npmDev`

## Backend Exercises

### Story 1: Caching Weather Data
The NWS API can be slow and we want to reduce unnecessary API calls. Implement a caching mechanism that:
- Caches weather data for 5 minutes per coordinate
- Returns cached data if available and not expired
- Add a `cached` boolean field to the response to indicate if data is from cache
- Consider using Spring's `@Cacheable` annotation or implement a simple in-memory cache

### Story 2: Frost Warning Enhancement
The PO asks you to improve the frost warning feature:
- Add a `frost_warning` field to the API response (boolean)
- Set to `true` when temperature is below 32°F (0°C)
- Add a `frost_severity` field with values: "none", "light" (25-32°F), "moderate" (15-25°F), "severe" (<15°F)
- Include a `frost_advisory` message with appropriate safety tips based on severity

### Story 3: Multiple Weather Service Integration
To improve reliability, integrate an additional weather service:
- Add Open-Meteo API (https://open-meteo.com/) as an alternative provider
- Implement a fallback mechanism:
  * Try NWS first (primary)
  * If NWS fails or takes >2 seconds, fallback to Open-Meteo
  * Add a `source` field to indicate which service provided the data
- Optional: If both services work, return averaged values with `source: "averaged"`

### Story 4: Historical Weather Data
Add an endpoint to retrieve weather history:
- Create `GET /api/weather/history?lat={lat}&long={long}&days={days}`
- Store weather data in an in-memory database (H2)
- Return the last N days of weather data for given coordinates
- Include trend analysis (temperature trending up/down)

## Frontend Exercises

### Story 5: Weather Map Visualization
Add an interactive map to visualize weather:
- Integrate a map library (Leaflet or Mapbox)
- Allow users to click on the map to get weather for that location
- Display weather information in a popup
- Show different colored markers based on temperature ranges

### Story 6: Weather Comparison Tool
Create a feature to compare weather between locations:
- Allow users to add multiple locations (up to 5)
- Display weather data side-by-side in a comparison table
- Highlight differences (warmest/coldest, highest/lowest humidity)
- Add ability to save favorite location combinations

### Story 7: Weather Alerts & Notifications
Implement a notification system:
- Check weather every 15 minutes in the background
- Show browser notifications for:
  * Frost warnings
  * Extreme temperatures (>95°F or <20°F)
  * Significant weather changes
- Add user preferences for notification types
- Store preferences in localStorage

### Story 8: Weather Trends Dashboard
Create a dashboard showing weather trends:
- Display 24-hour temperature graph (mock historical data if needed)
- Show humidity trends
- Add wind speed and direction indicator
- Implement a "feels like" temperature calculator
- Add sunrise/sunset times display

### Story 9: Responsive Design & Accessibility
Improve the UI/UX:
- Make the app fully responsive (mobile, tablet, desktop)
- Add dark/light theme toggle
- Ensure WCAG 2.1 AA compliance
- Add keyboard navigation support
- Implement loading skeletons instead of spinners
- Add error boundaries with user-friendly error messages

### Story 10: Performance Optimization
Optimize the frontend application:
- Implement React.memo for expensive components
- Add virtualization for any long lists
- Optimize bundle size (analyze with webpack-bundle-analyzer)
- Implement progressive image loading
- Add service worker for offline functionality
- Cache weather data in localStorage with expiry

## Full-Stack Exercises

### Story 11: User Preferences System
Build a complete preferences system:
- Backend: Add endpoints for saving/retrieving user preferences (no auth, use localStorage ID)
- Frontend: Create settings page for:
  * Temperature units (°F/°C)
  * Default location
  * Refresh interval
  * Notification preferences
- Persist preferences across sessions

### Story 12: Weather Export Feature
Add data export functionality:
- Backend: Generate CSV/JSON exports of weather history
- Frontend: Add "Export Data" button with format selection
- Include date range picker for historical exports
- Support bulk location exports

### Story 13: API Rate Limiting & Monitoring
Implement API protection:
- Add rate limiting to the backend (e.g., 100 requests per minute per IP)
- Create a simple monitoring dashboard showing:
  * Request count
  * Error rate
  * Average response time
  * Cache hit ratio
- Add health check endpoint with detailed status

## Additional Challenges (Optional)

### Advanced Story 1: Weather Prediction
Using historical data, implement a simple prediction model:
- Predict next hour's temperature based on trends
- Show confidence level
- Compare predictions with actual values

### Advanced Story 2: Multi-language Support
Add internationalization:
- Support English, Spanish, and French
- Translate weather descriptions
- Format dates/times according to locale
- Add language selector

### Advanced Story 3: WebSocket Real-time Updates
Implement real-time weather updates:
- Add WebSocket support to backend
- Push updates when weather changes significantly
- Show live update indicator in UI

## Testing Requirements

For each story completed:
- Add appropriate unit tests
- Include integration tests where applicable
- Maintain >80% code coverage
- Add E2E tests for critical user flows (using Cypress or Playwright)

## Evaluation Criteria

Your solution will be evaluated on:
1. Code quality and organization
2. Error handling and edge cases
3. Performance considerations
4. User experience
5. Test coverage
6. Documentation and comments
7. Git commit history and messages
