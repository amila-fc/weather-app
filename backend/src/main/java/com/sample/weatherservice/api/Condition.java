package com.sample.weatherservice.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Condition {

    /**
     * Ambient temperature in degrees Fahrenheit
     */
    @JsonProperty
    private Double temperature;

    /**
     * Relative humidity as percentage
     */
    @JsonProperty
    private Double humidity;

    /**
     * Current weather description
     */
    @JsonProperty
    private String description;

    /**
     * Apparent temperature (feels like) in degrees Fahrenheit
     */
    @JsonProperty
    private Double apparentTemperature;

    /**
     * Detailed weather summary
     */
    @JsonProperty
    private String summary;

    /**
     * Whether the response was served from the weather cache
     */
    @JsonProperty
    private boolean cached;

    /**
     * Whether frost is expected for the current temperature
     */
    @JsonProperty("frost_warning")
    private boolean frostWarning;

    /**
     * Frost severity bucket: none, light, moderate or severe
     */
    @JsonProperty("frost_severity")
    private FrostSeverity frostSeverity;

    /**
     * Frost safety advice for the computed severity
     */
    @JsonProperty("frost_advisory")
    private String frostAdvisory;

    /**
     * Which provider (or blend of providers) produced this payload
     */
    @JsonProperty
    private WeatherSource source;

    /**
     * Wind speed in miles per hour, when a provider reports it
     */
    @JsonProperty
    private Double windSpeedMph;

    /**
     * Direction the wind blows from, in degrees clockwise from north, when a provider reports it
     */
    @JsonProperty
    private Double windDirectionDegrees;

    // Legacy constructor for backward compatibility
    public Condition(Double temperature) {
        this.temperature = temperature;
    }

    // Full constructor with all fields
    public Condition(Double temperature, Double humidity, String description,
                    Double apparentTemperature, String summary) {
        this(temperature, humidity, description, apparentTemperature, summary, false);
    }

    // Full constructor including the cache indicator
    public Condition(Double temperature, Double humidity, String description,
                    Double apparentTemperature, String summary, boolean cached) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.description = description;
        this.apparentTemperature = apparentTemperature;
        this.summary = summary;
        this.cached = cached;
    }

    // Copy constructor: every withX method goes through it so no field is ever dropped.
    private Condition(Condition other) {
        this.temperature = other.temperature;
        this.humidity = other.humidity;
        this.description = other.description;
        this.apparentTemperature = other.apparentTemperature;
        this.summary = other.summary;
        this.cached = other.cached;
        this.frostWarning = other.frostWarning;
        this.frostSeverity = other.frostSeverity;
        this.frostAdvisory = other.frostAdvisory;
        this.source = other.source;
        this.windSpeedMph = other.windSpeedMph;
        this.windDirectionDegrees = other.windDirectionDegrees;
    }

    public Double getTemperature() {
        return temperature;
    }

    public Double getHumidity() {
        return humidity;
    }

    public String getDescription() {
        return description;
    }

    public Double getApparentTemperature() {
        return apparentTemperature;
    }

    public String getSummary() {
        return summary;
    }

    public boolean isCached() {
        return cached;
    }

    public Condition withCached(boolean cached) {
        Condition copy = new Condition(this);
        copy.cached = cached;
        return copy;
    }

    public boolean isFrostWarning() {
        return frostWarning;
    }

    public FrostSeverity getFrostSeverity() {
        return frostSeverity;
    }

    public String getFrostAdvisory() {
        return frostAdvisory;
    }

    public Condition withFrost(FrostAssessment assessment) {
        Condition copy = new Condition(this);
        copy.frostWarning = assessment.frostWarning();
        copy.frostSeverity = assessment.frostSeverity();
        copy.frostAdvisory = assessment.frostAdvisory();
        return copy;
    }

    public WeatherSource getSource() {
        return source;
    }

    public Condition withSource(WeatherSource source) {
        Condition copy = new Condition(this);
        copy.source = source;
        return copy;
    }

    public Double getWindSpeedMph() {
        return windSpeedMph;
    }

    public Double getWindDirectionDegrees() {
        return windDirectionDegrees;
    }

    /**
     * Wind is optional: a provider that does not report it leaves both fields null, so older cached
     * payloads and clients keep working.
     */
    public Condition withWind(Double windSpeedMph, Double windDirectionDegrees) {
        Condition copy = new Condition(this);
        copy.windSpeedMph = windSpeedMph;
        copy.windDirectionDegrees = windDirectionDegrees;
        return copy;
    }

    /**
     * Blends two provider payloads: numeric fields are averaged, while text fields (description, summary)
     * are taken from the primary provider because provider wording is not comparable. Wind direction uses a
     * circular mean, so 350° and 10° blend to 0° instead of 180°.
     */
    public static Condition averaged(Condition primary, Condition secondary) {
        return new Condition(
                mean(primary.temperature, secondary.temperature),
                mean(primary.humidity, secondary.humidity),
                primary.description,
                mean(primary.apparentTemperature, secondary.apparentTemperature),
                primary.summary)
                .withWind(mean(primary.windSpeedMph, secondary.windSpeedMph),
                        circularMean(primary.windDirectionDegrees, secondary.windDirectionDegrees))
                .withSource(WeatherSource.AVERAGED);
    }

    private static Double mean(Double first, Double second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return (first + second) / 2;
    }

    /**
     * Mean of two compass bearings via the unit vectors, normalised back into [0, 360).
     */
    private static Double circularMean(Double first, Double second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        double x = Math.cos(Math.toRadians(first)) + Math.cos(Math.toRadians(second));
        double y = Math.sin(Math.toRadians(first)) + Math.sin(Math.toRadians(second));
        double degrees = Math.toDegrees(Math.atan2(y, x));
        // Normalise into [0, 360): opposite-ish vectors can land on -0.0 or 360.0 without this.
        return (degrees + 360.0) % 360.0;
    }
}
