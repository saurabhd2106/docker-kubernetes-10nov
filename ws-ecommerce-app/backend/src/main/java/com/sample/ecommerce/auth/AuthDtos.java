package com.sample.ecommerce.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Size(min = 8, max = 100) String password,
            @Size(max = 100) String displayName
    ) {
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {
    }

    public record AuthResponse(String token, String username, String displayName) {
    }

    public record MeResponse(Long id, String username, String displayName) {
    }
}
