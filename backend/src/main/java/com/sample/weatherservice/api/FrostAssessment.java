package com.sample.weatherservice.api;

/**
 * Frost assessment derived from the current temperature.
 *
 * @param frostWarning  {@code true} whenever frost is expected, i.e. severity is not {@link FrostSeverity#NONE}
 * @param frostSeverity the severity bucket for the temperature
 * @param frostAdvisory safety advice resolved from the message bundle
 */
public record FrostAssessment(boolean frostWarning, FrostSeverity frostSeverity, String frostAdvisory) {
}
