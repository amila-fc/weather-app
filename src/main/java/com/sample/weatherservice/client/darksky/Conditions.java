package com.sample.weatherservice.client.darksky;

class Conditions {
    private Double tempC;

    Conditions(Double tempC) {
        this.tempC = tempC;
    }

    public Double getTempC() {
        return tempC;
    }
}
