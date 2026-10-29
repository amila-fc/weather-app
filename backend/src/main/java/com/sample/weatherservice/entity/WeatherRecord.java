package com.sample.weatherservice.entity;

import com.sample.weatherservice.api.WeatherSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One recorded weather query. Coordinates are stored normalized to 4 decimal places, the same key
 * convention the {@code weather} cache uses.
 */
@Entity
@Table(name = "weather_history",
        indexes = @Index(name = "idx_weather_history_coordinates_recorded_at",
                columnList = "latitude, longitude, recorded_at"))
public class WeatherRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 8, scale = 4)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 8, scale = 4)
    private BigDecimal longitude;

    private Double temperature;

    private Double humidity;

    @Column(name = "apparent_temperature")
    private Double apparentTemperature;

    @Column(length = 1000)
    private String description;

    @Column(length = 1000)
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private WeatherSource source;

    @Column(nullable = false)
    private boolean cached;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    protected WeatherRecord() {
    }

    public WeatherRecord(BigDecimal latitude, BigDecimal longitude, Double temperature, Double humidity,
                         Double apparentTemperature, String description, String summary,
                         WeatherSource source, boolean cached, Instant recordedAt) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.temperature = temperature;
        this.humidity = humidity;
        this.apparentTemperature = apparentTemperature;
        this.description = description;
        this.summary = summary;
        this.source = source;
        this.cached = cached;
        this.recordedAt = recordedAt;
    }

    public Long getId() {
        return id;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public Double getTemperature() {
        return temperature;
    }

    public Double getHumidity() {
        return humidity;
    }

    public Double getApparentTemperature() {
        return apparentTemperature;
    }

    public String getDescription() {
        return description;
    }

    public String getSummary() {
        return summary;
    }

    public WeatherSource getSource() {
        return source;
    }

    public boolean isCached() {
        return cached;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }
}
