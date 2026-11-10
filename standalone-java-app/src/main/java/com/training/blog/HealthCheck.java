package com.training.blog;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Exits 0 when {@code /health} on the local server answers 200, 1 otherwise.
 * Used by the Docker {@code HEALTHCHECK} because the runtime image has no curl or wget.
 */
public final class HealthCheck {

    public static void main(String[] args) {
        String port = System.getenv().getOrDefault("PORT", "8080");
        try (HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build()) {
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/health"))
                    .timeout(Duration.ofSeconds(2))
                    .build();
            int status = client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            System.exit(status == 200 ? 0 : 1);
        } catch (Exception e) {
            System.err.println("Health check failed: " + e);
            System.exit(1);
        }
    }
}
