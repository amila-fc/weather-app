package com.sample.weatherservice.api;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FrostSeverityTest {

    @Test
    void wireValues_areTheLowercaseNamesAndNothingElse() {
        // when
        Set<String> wireValues = Arrays.stream(FrostSeverity.values())
                .map(FrostSeverity::toWireValue)
                .collect(Collectors.toSet());

        // then
        assertEquals(Set.of("none", "light", "moderate", "severe"), wireValues);
        assertEquals("none", FrostSeverity.NONE.toWireValue());
        assertEquals("light", FrostSeverity.LIGHT.toWireValue());
        assertEquals("moderate", FrostSeverity.MODERATE.toWireValue());
        assertEquals("severe", FrostSeverity.SEVERE.toWireValue());
    }

    @Test
    void messageBundle_definesANonBlankAdvisoryForEverySeverity() {
        // given
        ResourceBundle bundle = ResourceBundle.getBundle("messages", Locale.ROOT);

        // when + then
        for (FrostSeverity severity : FrostSeverity.values()) {
            String key = "frost.advisory." + severity.toWireValue();
            assertTrue(bundle.containsKey(key), "messages.properties is missing " + key);
            assertFalse(bundle.getString(key).isBlank(), "messages.properties has a blank value for " + key);
        }
    }
}
