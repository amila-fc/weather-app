package com.sample.weatherservice.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FeelsLikeCalculatorTest {

    @Test
    void providerApparentTemperatureAlwaysWins() {
        // when + then
        assertEquals(41.0, FeelsLikeCalculator.feelsLike(41.0, 20.0, 90.0, 25.0));
    }

    @Test
    void coldAndWindy_appliesWindChill() {
        // when + then the NWS wind-chill chart reads -19 °F for 5 °F with a 30 mph wind
        assertEquals(-19.0, FeelsLikeCalculator.feelsLike(null, 5.0, 60.0, 30.0), 0.5);
    }

    @Test
    void windChillBoundary_atFiftyDegreesAndThreeMph_stillApplies() {
        // when
        double feelsLike = FeelsLikeCalculator.feelsLike(null, 50.0, 60.0, 3.0);

        // then it is computed, so it differs from the dry-bulb value
        assertEquals(FeelsLikeCalculator.windChill(50.0, 3.0), feelsLike, 0.0001);
        assertTrue(feelsLike < 50.0);
    }

    @Test
    void windChillBoundary_justAboveFiftyDegrees_fallsBackToDryBulb() {
        // when + then
        assertEquals(50.1, FeelsLikeCalculator.feelsLike(null, 50.1, 60.0, 30.0), 0.0001);
    }

    @Test
    void windChillBoundary_belowThreeMph_fallsBackToDryBulb() {
        // when + then
        assertEquals(30.0, FeelsLikeCalculator.feelsLike(null, 30.0, 60.0, 2.9), 0.0001);
    }

    @Test
    void hotAndHumid_appliesHeatIndex() {
        // when + then the NWS heat-index table reads 112 °F for 96 °F at 55 % humidity
        assertEquals(112.0, FeelsLikeCalculator.feelsLike(null, 96.0, 55.0, 5.0), 0.5);
    }

    @Test
    void heatIndexBoundary_atEightyDegreesAndFortyPercent_stillApplies() {
        // when
        double feelsLike = FeelsLikeCalculator.feelsLike(null, 80.0, 40.0, 0.0);

        // then
        assertEquals(FeelsLikeCalculator.heatIndex(80.0, 40.0), feelsLike, 0.0001);
    }

    @Test
    void heatIndexBoundary_justBelowEightyDegrees_fallsBackToDryBulb() {
        // when + then
        assertEquals(79.9, FeelsLikeCalculator.feelsLike(null, 79.9, 90.0, 0.0), 0.0001);
    }

    @Test
    void heatIndexBoundary_justBelowFortyPercent_fallsBackToDryBulb() {
        // when + then
        assertEquals(85.0, FeelsLikeCalculator.feelsLike(null, 85.0, 39.0, 0.0), 0.0001);
    }

    @Test
    void neutralBand_returnsTheDryBulbTemperature() {
        // when + then
        assertEquals(68.0, FeelsLikeCalculator.feelsLike(null, 68.0, 60.0, 8.0), 0.0001);
    }

    @Test
    void missingTemperatureAndProviderValue_returnsNull() {
        // when + then
        assertNull(FeelsLikeCalculator.feelsLike(null, null, 60.0, 8.0));
    }

    @Test
    void missingWindOrHumidity_doesNotBreakTheColdOrHotBranch() {
        // when + then
        assertEquals(20.0, FeelsLikeCalculator.feelsLike(null, 20.0, null, null), 0.0001);
        assertEquals(95.0, FeelsLikeCalculator.feelsLike(null, 95.0, null, null), 0.0001);
    }
}
