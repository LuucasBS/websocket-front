package com.seuprojeto.chat.domain.user;

import java.time.Instant;

public record User(
    UserId id,
    String username,
    String passwordHash,
    UserStatus status,
    Instant createdAt,
    Instant lastSeen
) {
    public static User create(String username, String passwordHash) {
        Instant now = Instant.now();
        return new User(UserId.generate(), username, passwordHash, UserStatus.OFFLINE, now, now);
    }

    public User markOnline() {
        return new User(id, username, passwordHash, UserStatus.ONLINE, createdAt, Instant.now());
    }

    public User markOffline() {
        return new User(id, username, passwordHash, UserStatus.OFFLINE, createdAt, Instant.now());
    }
}