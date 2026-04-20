plugins {
    java
    id("org.springframework.boot") version "4.0.5"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "online"
version = "0.0.1-SNAPSHOT"
description = "horarios_api"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Web MVC
    implementation("org.springframework.boot:spring-boot-starter-webmvc")

    // Data JPA + PostgreSQL
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")

    // Bean Validation (Jakarta)
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Spring Security
    implementation("org.springframework.boot:spring-boot-starter-security")

    // OAuth2 Client → Google login (authorization code flow)
    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-client")

    // OAuth2 Resource Server → JWT validation (includes nimbus-jose-jwt)
    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")

    // API Documentation
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.2")

    // Lombok — boilerplate reduction
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Dev Tools
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // Actuator → /actuator/health endpoint for Docker healthcheck
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Spring Mail (JavaMailSender → envío de correos SMTP)
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // .env file support (lee backend/horarios_api/.env automáticamente)
    implementation("me.paulschwarz:spring-dotenv:4.0.0")

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testCompileOnly("org.projectlombok:lombok")
    testAnnotationProcessor("org.projectlombok:lombok")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()

    // Cargar variables del .env para los tests
    val envFile = rootProject.file(".env")
    if (envFile.exists()) {
        envFile.readLines()
            .filter { it.isNotBlank() && !it.startsWith("#") && it.contains("=") }
            .forEach { line ->
                val (key, value) = line.split("=", limit = 2)
                environment(key.trim(), value.trim())
            }
    }
}
