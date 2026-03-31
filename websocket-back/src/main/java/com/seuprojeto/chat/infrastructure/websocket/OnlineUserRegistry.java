package com.seuprojeto.chat.infrastructure.websocket;

import java.util.Set;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class OnlineUserRegistry {

    private static final String KEY = "chat:online:users";

    private final StringRedisTemplate stringRedisTemplate;

    public OnlineUserRegistry(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    public void markOnline(String userId) {
        stringRedisTemplate.opsForSet().add(KEY, userId);
    }

    public void markOffline(String userId) {
        stringRedisTemplate.opsForSet().remove(KEY, userId);
    }

    public Set<String> listOnlineUserIds() {
        Set<String> users = stringRedisTemplate.opsForSet().members(KEY);
        return users == null ? Set.of() : users;
    }
}