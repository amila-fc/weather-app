rootProject.name = "weatherservice"

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

include("backend")
include("frontend")