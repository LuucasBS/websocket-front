package com.seuprojeto.chat.infrastructure.security;

import com.seuprojeto.chat.domain.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final Key signingKey;
    private final long expirationInSeconds;

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiration}") long expirationInSeconds) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (Exception ex) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationInSeconds = expirationInSeconds;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(expirationInSeconds);
        Map<String, Object> claims = Map.of("username", user.username(), "roles", List.of("ROLE_USER"));

        return Jwts
            .builder()
            .subject(user.id().toString())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiration))
            .claims(claims)
            .signWith(signingKey)
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public String extractUserId(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).get("username", String.class);
    }

    public Instant extractExpiration(String token) {
        return extractAllClaims(token).getExpiration().toInstant();
    }

    public long secondsUntilExpiration(String token) {
        long seconds = extractExpiration(token).getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(seconds, 1);
    }

    public static String stripBearerPrefix(String rawToken) {
        if (rawToken == null) {
            return "";
        }
        if (rawToken.startsWith("Bearer ")) {
            return rawToken.substring(7);
        }
        return rawToken;
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser().verifyWith((javax.crypto.SecretKey) signingKey).build().parseSignedClaims(token).getPayload();
    }
}