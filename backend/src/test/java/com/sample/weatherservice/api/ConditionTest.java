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
}
