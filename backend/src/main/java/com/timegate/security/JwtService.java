package com.timegate.security;

import com.timegate.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTtl;
    private final long refreshTtl;

    public JwtService(AppProperties props) {
        this.key = Keys.hmacShaKeyFor(props.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
        this.accessTtl = props.getJwt().getAccessTtlSeconds();
        this.refreshTtl = props.getJwt().getRefreshTtlSeconds();
    }

    public long getAccessTtl() { return accessTtl; }

    public String generateAccess(String subject, Map<String, Object> claims) {
        return build(subject, claims, accessTtl, "access");
    }

    public String generateRefresh(String subject) {
        return build(subject, Map.of(), refreshTtl, "refresh");
    }

    private String build(String subject, Map<String, Object> claims, long ttlSeconds, String type) {
        Date now = new Date();
        return Jwts.builder()
            .subject(subject)
            .claims(claims)
            .claim("typ", type)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + ttlSeconds * 1000))
            .signWith(key)
            .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public String getUsername(String token) {
        return parse(token).getSubject();
    }
}
