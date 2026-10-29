package com.sample.weatherservice.service;

import com.sample.weatherservice.api.FrostAssessment;
import com.sample.weatherservice.api.FrostSeverity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

class FrostWarningServiceTest {

    private final MessageSource messageSource = Mockito.mock(MessageSource.class);

    private FrostWarningService service;

    @BeforeEach
    void stubAdvisories() {
        when(messageSource.getMessage(anyString(), isNull(), eq(Locale.ROOT)))
                .thenAnswer(invocation -> "advisory for " + invocation.getArgument(0));
        service = new FrostWarningService(messageSource);
    }

    @Test
    void assess_atFreezingPoint_returnsNoneWithoutWarning() {
        // when
        FrostAssessment assessment = service.assess(32.0);

        // then
        assertEquals(FrostSeverity.NONE, assessment.frostSeverity());
        assertFalse(assessment.frostWarning());
        assertEquals("advisory for frost.advisory.none", assessment.frostAdvisory());
    }

    @Test
    void assess_justBelowFreezing_returnsLightWithWarning() {
        // when
        FrostAssessment assessment = service.assess(31.9);

        // then
        assertEquals(FrostSeverity.LIGHT, assessment.frostSeverity());
        assertTrue(assessment.frostWarning());
    }

    @Test
    void assess_atHardFrostBoundary_returnsLight() {
        // when + then
        assertEquals(FrostSeverity.LIGHT, service.assess(25.0).frostSeverity());
    }

    @Test
    void assess_justBelowHardFrostBoundary_returnsModerate() {
        // when + then
        assertEquals(FrostSeverity.MODERATE, service.assess(24.9).frostSeverity());
    }

    @Test
    void assess_atModerateBoundary_returnsModerate() {
        // when + then
        assertEquals(FrostSeverity.MODERATE, service.assess(15.0).frostSeverity());
    }

    @Test
    void assess_justBelowModerateBoundary_returnsSevere() {
        // when + then
        assertEquals(FrostSeverity.SEVERE, service.assess(14.9).frostSeverity());
    }

    @Test
    void assess_warmTemperature_returnsNone() {
        // when
        FrostAssessment assessment = service.assess(90.0);

        // then
        assertEquals(FrostSeverity.NONE, assessment.frostSeverity());
        assertFalse(assessment.frostWarning());
    }

    @Test
    void assess_severityNone_neverReportsAWarning() {
        // when + then
        for (double temperature : new double[] {32.0, 32.1, 55.0, 90.0}) {
            FrostAssessment assessment = service.assess(temperature);
            assertEquals(FrostSeverity.NONE, assessment.frostSeverity());
            assertFalse(assessment.frostWarning(), "no warning expected at " + temperature + "F");
        }
    }

    @Test
    void assess_whenAdvisoryTextChanges_usesTheNewTextWithoutCodeChanges() {
        // given
        when(messageSource.getMessage("frost.advisory.light", null, Locale.ROOT))
                .thenReturn("Locally configured light frost advice.");

        // when
        FrostAssessment assessment = service.assess(28.0);

        // then
        assertEquals("Locally configured light frost advice.", assessment.frostAdvisory());
    }

    @Test
    void assess_sameTemperature_alwaysProducesTheSameAssessment() {
        // when
        FrostAssessment first = service.assess(20.0);
        FrostAssessment second = service.assess(20.0);

        // then
        assertEquals(first, second);
    }

    @Test
    void assess_missingAdvisoryKey_raisesNoSuchMessageException() {
        // given
        FrostWarningService serviceWithoutBundle = new FrostWarningService(new ResourceBundleMessageSource());

        // when + then
        assertThrows(NoSuchMessageException.class, () -> serviceWithoutBundle.assess(20.0));
    }
}
