package com.timegate.dto;

import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(
        @NotBlank String login,
        @NotBlank String password) {}

    public record RefreshRequest(
        @NotBlank String refreshToken) {}

    public record ChangePasswordRequest(
        @NotBlank String oldPassword,
        @NotBlank String newPassword) {}

    public record UserBrief(Long id, String login, String role, Long employeeId) {}

    public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserBrief user) {}
}
