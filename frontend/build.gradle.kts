import com.github.gradle.node.npm.task.NpmTask

plugins {
    id("com.github.node-gradle.node") version "7.1.0"
}

node {
    version = "20.11.0"
    npmVersion = "10.2.4"
    download = true
}

// Build the React app
tasks.register<NpmTask>("npmBuild") {
    args = listOf("run", "build")
    dependsOn(tasks.npmInstall)
}

// Development server
tasks.register<NpmTask>("npmDev") {
    args = listOf("run", "dev")
    dependsOn(tasks.npmInstall)
}

// Clean task
tasks.register<Delete>("clean") {
    delete("node_modules", "dist", ".vite")
}