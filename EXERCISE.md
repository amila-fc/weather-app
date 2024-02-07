# Coding Exercise

General Notes:
- there might be some bugs in the provided codebase. If you find them, add a `FIXME` or fix them.
- should you encounter something that you don't entirely approve (or even just have some comment about) - don't be shy, flag the place and add a comment.

## Story 1:
The DarkSky weather service was shut down. As an alternative you can use the service from https://open-meteo.com/

## Story 2:
The PO asks you to add an indication to the user if there is a frost warning.
Extend the current implementation to also return a frost warning if the temperature drops below 0. You have agreed with your team members that the new JSON property should be named `frost_warning`.

## Story 3:
Dark Sky has been known to be unreliable in the past, both in terms of the reported weather conditions, as well as regarding service availability. Hence you're meant to explore and implement an alternative based on the Open Weather API, for which your Product owner has given you the following acceptance criteria:

* If both services are operational, our service should return the average of both.
* If one service is not operational, returns an error, or does not respond within 2 seconds, we should automatically fall back to the other


#### Additional Information
Open Weather API Documentation
https://openweathermap.org/current
