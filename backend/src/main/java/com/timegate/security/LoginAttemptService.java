package com.timegate.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/** In-memory brute-force protection: locks a login after too many failed attempts. */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_SECONDS = 15 * 60;   // 15 minutes

    private record Attempt(int count, Instant lockedUntil) {}

    private final ConcurrentMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isLocked(String login) {
        Attempt a = attempts.get(key(login));
        return a != null && a.lockedUntil() != null && Instant.now().isBefore(a.lockedUntil());
    }

    public long remainingLockSeconds(String login) {
        Attempt a = attempts.get(key(login));
        if (a == null || a.lockedUntil() == null) return 0;
        long s = a.lockedUntil().getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, s);
    }

    public void onFailure(String login) {
        attempts.compute(key(login), (k, prev) -> {
            int count = (prev == null ? 0 : prev.count()) + 1;
            Instant lockedUntil = count >= MAX_ATTEMPTS ? Instant.now().plusSeconds(LOCK_SECONDS) : null;
            return new Attempt(count, lockedUntil);
        });
    }

    public void onSuccess(String login) {
        attempts.remove(key(login));
    }

    private static String key(String login) {
        return login == null ? "" : login.toLowerCase();
    }
}
