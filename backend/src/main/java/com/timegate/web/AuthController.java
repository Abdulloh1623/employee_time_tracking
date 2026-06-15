package com.timegate.web;

import com.timegate.dto.AuthDtos.*;
import com.timegate.security.CustomUserDetails;
import com.timegate.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth", description = "Authentication")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in / Tizimga kirish")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh token / Tokenni yangilash")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req);
    }

    @GetMapping("/me")
    @Operation(summary = "Current user / Joriy foydalanuvchi")
    public ResponseEntity<UserBrief> me(@AuthenticationPrincipal CustomUserDetails ud) {
        return ResponseEntity.ok(auth.me(ud));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change own password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req,
                                               @AuthenticationPrincipal CustomUserDetails ud) {
        auth.changePassword(ud, req);
        return ResponseEntity.noContent().build();
    }
}
