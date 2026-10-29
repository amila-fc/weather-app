package com.sample.weatherservice.repository;

import com.sample.weatherservice.entity.WeatherRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface WeatherRecordRepository extends JpaRepository<WeatherRecord, Long> {

    List<WeatherRecord> findByLatitudeAndLongitudeAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(
            BigDecimal latitude, BigDecimal longitude, Instant since);
}
