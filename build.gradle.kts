// Root build configuration for monorepo
allprojects {
    group = "com.example"
    version = "0.0.1-SNAPSHOT"

    repositories {
        mavenCentral()
    }
}

// Configure Java projects
subprojects {
    if (name == "backend") {
        apply(plugin = "java")
    }
}

// Root build task builds everything
tasks.register("build") {
    dependsOn(":backend:build", ":frontend:npmBuild")
}
