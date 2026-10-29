package com.sample.weatherservice.service;

/**
 * The "feels like" value shown to users.
 *
 * <p>A provider's own apparent temperature wins. Otherwise the value is derived: the NWS wind-chill formula
 * when it is cold and windy, the Rothfusz heat index when it is hot and humid, and the dry-bulb temperature in
 * the neutral band.
 */
public final class FeelsLikeCalculator {

    /** Wind chill is only defined at or below this temperature (°F). */
    private static final double WIND_CHILL_MAX_TEMPERATURE_F = 50.0;

    /** Wind chill is only meaningful from this wind speed upwards (mph). */
    private static final double WIND_CHILL_MIN_WIND_MPH = 3.0;

    /** The heat index is only meaningful from this temperature upwards (°F). */
    private static final double HEAT_INDEX_MIN_TEMPERATURE_F = 80.0;

    /** The heat index is only meaningful from this relative humidity upwards (%). */
    private static final double HEAT_INDEX_MIN_HUMIDITY = 40.0;

    private FeelsLikeCalculator() {
    }

    /**
     * @param providerApparentTemperature the provider's own value, used as-is when present
     * @param temperature                dry-bulb temperature in °F
     * @param humidity                   relative humidity in percent
     * @param windSpeedMph               wind speed in mph
     * @return the feels-like temperature in °F, or null when there is no temperature to reason about
     */
    public static Double feelsLike(Double providerApparentTemperature, Double temperature, Double humidity,
                                   Double windSpeedMph) {
        if (providerApparentTemperature != null) {
            return providerApparentTemperature;
        }
        if (temperature == null) {
            return null;
        }
        if (temperature <= WIND_CHILL_MAX_TEMPERATURE_F
                && windSpeedMph != null && windSpeedMph >= WIND_CHILL_MIN_WIND_MPH) {
            return windChill(temperature, windSpeedMph);
        }
        if (temperature >= HEAT_INDEX_MIN_TEMPERATURE_F
                && humidity != null && humidity >= HEAT_INDEX_MIN_HUMIDITY) {
            return heatIndex(temperature, humidity);
        }
        return temperature;
    }

    /**
     * NWS wind-chill formula, valid for temperatures at or below 50 °F and winds of at least 3 mph.
     */
    static double windChill(double temperatureF, double windSpeedMph) {
        double windFactor = Math.pow(windSpeedMph, 0.16);
        return 35.74 + 0.6215 * temperatureF - 35.75 * windFactor + 0.4275 * temperatureF * windFactor;
    }

    /**
     * Rothfusz regression as used by the NWS heat-index table (°F in, °F out).
     */
    static double heatIndex(double temperatureF, double humidity) {
        double t = temperatureF;
        double rh = humidity;
        return -42.379
                + 2.04901523 * t
                + 10.14333127 * rh
                - 0.22475541 * t * rh
                - 0.00683783 * t * t
                - 0.05481717 * rh * rh
                + 0.00122874 * t * t * rh
                + 0.00085282 * t * rh * rh
                - 0.00000199 * t * t * rh * rh;
    }
}
