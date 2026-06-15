package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.domain.AppUser;
import com.timegate.dto.AuthDtos.*;
import com.timegate.repo.AppUserRepository;
import com.timegate.security.CustomUserDetails;
import com.timegate.security.JwtService;
import com.timegate.security.LoginAttemptService;
import io.jsonwebtoken.Claims;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

@Service
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtService jwt;
    private final AppUserRepository users;
    private final LoginAttemptService loginAttempts;
    private final AuditService audit;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authManager, JwtService jwt, AppUserRepository users,
                       LoginAttemptService loginAttempts, AuditService audit, PasswordEncoder passwordEncoder) {
        this.authManager = authManager;
        this.jwt = jwt;
        this.users = users;
        this.loginAttempts = loginAttempts;
        this.audit = audit;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public TokenResponse login(LoginRequest req) {
        if (loginAttempts.isLocked(req.login())) {
            long mins = (loginAttempts.remainingLockSeconds(req.login()) + 59) / 60;
            audit.recordForUser(null, "LOGIN_LOCKED", "user", null, Map.of("login", req.login()));
            throw ApiException.tooMany("account_locked",
                "Hisob vaqtincha bloklangan. " + mins + " daqiqadan so'ng urinib ko'ring.");
        }

        Authentication auth;
        try {
            auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.login(), req.password()));
        } catch (BadCredentialsException e) {
            loginAttempts.onFailure(req.login());
            audit.recordForUser(null, "LOGIN_FAILED", "user", null, Map.of("login", req.login()));
            throw e;
        }

        loginAttempts.onSuccess(req.login());
        CustomUserDetails ud = (CustomUserDetails) auth.getPrincipal();

        AppUser u = ud.getUser();
        u.setLastLoginAt(OffsetDateTime.now());
        users.save(u);

        audit.recordForUser(ud.getId(), "LOGIN", "user", ud.getId(), Map.of("login", ud.getUsername()));
        return issue(ud);
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(RefreshRequest req) {
        Claims claims;
        try {
            claims = jwt.parse(req.refreshToken());
        } catch (Exception e) {
            throw ApiException.unauthorized("Invalid refresh token.");
        }
        if (!"refresh".equals(claims.get("typ"))) {
            throw ApiException.unauthorized("Provided token is not a refresh token.");
        }
        AppUser u = users.findByLogin(claims.getSubject())
            .orElseThrow(() -> ApiException.unauthorized("User no longer exists."));
        return issue(new CustomUserDetails(u));
    }

    @Transactional(readOnly = true)
    public UserBrief me(CustomUserDetails ud) {
        return new UserBrief(ud.getId(), ud.getUsername(), ud.getRoleName(), ud.getEmployeeId());
    }

    @Transactional
    public void changePassword(CustomUserDetails ud, ChangePasswordRequest req) {
        AppUser u = users.findById(ud.getId())
            .orElseThrow(() -> ApiException.unauthorized("User not found."));
        if (!passwordEncoder.matches(req.oldPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Joriy parol noto'g'ri.");
        }
        if (req.newPassword().length() < 6) {
            throw ApiException.badRequest("Yangi parol kamida 6 belgidan iborat bo'lsin.");
        }
        u.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        users.save(u);
        audit.record("PASSWORD_CHANGE", "user", ud.getId(), null);
    }

    private TokenResponse issue(CustomUserDetails ud) {
        Map<String, Object> claims = Map.of(
            "uid", ud.getId(),
            "role", ud.getRoleName() == null ? "" : ud.getRoleName());
        String access = jwt.generateAccess(ud.getUsername(), claims);
        String refresh = jwt.generateRefresh(ud.getUsername());
        return new TokenResponse(access, refresh, "Bearer", jwt.getAccessTtl(),
            new UserBrief(ud.getId(), ud.getUsername(), ud.getRoleName(), ud.getEmployeeId()));
    }
}
