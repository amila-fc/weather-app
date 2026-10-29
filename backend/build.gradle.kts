plugins {
    java
    jacoco
    id("org.springframework.boot") version "3.3.6"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    // Generated OpenAPI 3 contract for the REST layer (served at /v3/api-docs, UI at /swagger-ui.html).
    // springdoc is not managed by the Spring Boot BOM, so the version is pinned to the Boot 3.3 line.
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("org.apache.httpcomponents:httpclient:4.5.6")
    runtimeOnly("com.h2database:h2")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

jacoco {
    toolVersion = "0.8.12"
}

// Coverage reports feed the README badge and the CI job summary.
tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required = true
        csv.required = true
        html.required = true
    }
}

tasks.test {
    // OpenApiContractTest reads the committed contract from the repository root, which is outside this
    // project, so it has to be declared as an input or Gradle would serve a stale test result.
    inputs.files(layout.projectDirectory.file("../docs/openapi.json"))
        .withPropertyName("openApiContract")
    finalizedBy(tasks.jacocoTestReport)
}

// Ensure frontend build output is included in the JAR
tasks.processResources {
    dependsOn(":frontend:npmBuild")
    from("../frontend/dist") {
        into("static")
    }
}