package com.seuprojeto.chat.infrastructure.security;

import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class TokenBlacklistService {

    private final StringRedisTemplate stringRedisTemplate;

    public TokenBlacklistService(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    public void blacklist(String token, long ttlSeconds) {
        if (token == null || token.isBlank()) {
            return;
        }
        stringRedisTemplate.opsForValue().set(key(token), "1", Duration.ofSeconds(ttlSeconds));
    }

    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key(token)));
    }

    private String key(String token) {
        return "auth:blacklist:" + token;
    }
}