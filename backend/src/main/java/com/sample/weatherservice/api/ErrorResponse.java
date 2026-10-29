package com.sample.weatherservice.api;

/**
 * Body of every error response produced by {@code GlobalExceptionHandler}, and therefore part of the
 * OpenAPI contract referenced by the controller's {@code @ApiResponse} annotations.
 *
 * @param error   short, stable category such as {@code Invalid request}
 * @param message human-readable detail intended for the caller
 */
public record ErrorResponse(String error, String message) {
}
