package com.sample.weatherservice.service;

import com.sample.weatherservice.api.FrostAssessment;
import com.sample.weatherservice.api.FrostSeverity;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class FrostWarningService {

    private static final String ADVISORY_KEY_PREFIX = "frost.advisory.";

    // Bucket thresholds in degrees Fahrenheit. Each bucket is inclusive of its lower bound and exclusive
    // of the next one up, so a temperature belongs to exactly one bucket: 32.0 -> NONE, 25.0 -> LIGHT,
    // 15.0 -> MODERATE, below 15.0 -> SEVERE.
    private static final double FREEZING_FAHRENHEIT = 32.0;
    private static final double HARD_FROST_FAHRENHEIT = 25.0;
    private static final double SEVERE_FROST_FAHRENHEIT = 15.0;

    private final MessageSource messageSource;

    public FrostWarningService(final MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public FrostAssessment assess(final double temperatureFahrenheit) {
        final FrostSeverity severity = classify(temperatureFahrenheit);
        return new FrostAssessment(severity != FrostSeverity.NONE, severity, advisoryFor(severity));
    }

    private FrostSeverity classify(final double temperatureFahrenheit) {
        if (temperatureFahrenheit >= FREEZING_FAHRENHEIT) {
            return FrostSeverity.NONE;
        }
        if (temperatureFahrenheit >= HARD_FROST_FAHRENHEIT) {
            return FrostSeverity.LIGHT;
        }
        if (temperatureFahrenheit >= SEVERE_FROST_FAHRENHEIT) {
            return FrostSeverity.MODERATE;
        }
        return FrostSeverity.SEVERE;
    }

    // No default message: a missing bundle entry must raise NoSuchMessageException instead of leaking the key.
    private String advisoryFor(final FrostSeverity severity) {
        return messageSource.getMessage(ADVISORY_KEY_PREFIX + severity.toWireValue(), null, Locale.ROOT);
    }
}
