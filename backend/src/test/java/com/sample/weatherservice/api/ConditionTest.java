package com.sample.weatherservice.api;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConditionTest {

    @Test
    void legacyConstructor_stillWorksAndDefaultsToNotCached() {
        // when
        Condition condition = new Condition(78.5);

        // then
        assertEquals(78.5, condition.getTemperature());
        assertNull(condition.getHumidity());
        assertFalse(condition.isCached());
    }

    @Test
    void fullConstructor_defaultsToNotCached() {
        // when
        Condition condition = new Condition(78.5, 65.0, "Clear", 76.0, "Clear skies");

        // then
        assertEquals(65.0, condition.getHumidity());
        assertEquals("Clear skies", condition.getSummary());
        assertFalse(condition.isCached());
    }

    @Test
    void withCached_returnsACopyWithTheFlagSetAndLeavesTheOriginalUntouched() {
        // given
        Condition condition = new Condition(78.5, 65.0, "Clear", 76.0, "Clear skies");

        // when
        Condition cached = condition.withCached(true);

        // then
        assertTrue(cached.isCached());
        assertFalse(condition.isCached());
        assertEquals(condition.getTemperature(), cached.getTemperature());
        assertEquals(condition.getSummary(), cached.getSummary());
    }

    @Test
    void withWind_copiesTheOtherFieldsAndLeavesTheOriginalUntouched() {
        // given
        Condition condition = new Condition(78.5, 65.0, "Clear", 76.0, "Clear skies");

        // when
        Condition windy = condition.withWind(9.4, 285.0);

        // then
        assertEquals(9.4, windy.getWindSpeedMph());
        assertEquals(285.0, windy.getWindDirectionDegrees());
        assertNull(condition.getWindSpeedMph());
        assertNull(condition.getWindDirectionDegrees());
        assertEquals(condition.getTemperature(), windy.getTemperature());
        assertEquals(condition.getDescription(), windy.getDescription());
    }

    @Test
    void averaged_blendsWindSpeedArithmetically() {
        // given
        Condition primary = new Condition(50.0, 60.0, "Clear", 48.0, "Clear skies").withWind(10.0, 180.0);
        Condition secondary = new Condition(54.0, 70.0, "Sunny", 52.0, "Sunny skies").withWind(20.0, 180.0);

        // when
        Condition averaged = Condition.averaged(primary, secondary);

        // then
        assertEquals(15.0, averaged.getWindSpeedMph(), 0.0001);
        assertEquals(WeatherSource.AVERAGED, averaged.getSource());
    }

    @Test
    void averaged_usesACircularMeanSo350And10Make0Not180() {
        // given
        Condition primary = new Condition(50.0, 60.0, "Clear", 48.0, "Clear skies").withWind(10.0, 350.0);
        Condition secondary = new Condition(50.0, 60.0, "Sunny", 48.0, "Sunny skies").withWind(10.0, 10.0);

        // when
        Condition averaged = Condition.averaged(primary, secondary);

        // then
        assertEquals(0.0, averaged.getWindDirectionDegrees(), 0.0001);
    }

    @Test
    void averaged_keepsANullDirectionFromBlankingTheOtherProvider() {
        // given
        Condition primary = new Condition(50.0, 60.0, "Clear", 48.0, "Clear skies").withWind(10.0, 285.0);
        Condition secondary = new Condition(50.0, 60.0, "Sunny", 48.0, "Sunny skies").withWind(8.0, null);

        // when
        Condition averaged = Condition.averaged(primary, secondary);

        // then
        assertEquals(285.0, averaged.getWindDirectionDegrees(), 0.0001);
        assertEquals(9.0, averaged.getWindSpeedMph(), 0.0001);
    }

    @Test
    void averaged_leavesBothWindFieldsNullWhenNeitherProviderReportsWind() {
        // given
        Condition primary = new Condition(50.0, 60.0, "Clear", 48.0, "Clear skies");
        Condition secondary = new Condition(54.0, 70.0, "Sunny", 52.0, "Sunny skies");

        // when
        Condition averaged = Condition.averaged(primary, secondary);

        // then
        assertNull(averaged.getWindSpeedMph());
        assertNull(averaged.getWindDirectionDegrees());
    }
}
