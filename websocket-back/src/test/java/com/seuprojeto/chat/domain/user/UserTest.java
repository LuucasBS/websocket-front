package com.seuprojeto.chat.domain.user;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    void shouldCreateOfflineUser() {
        User user = User.create("alice", "hash");

        assertEquals("alice", user.username());
        assertEquals(UserStatus.OFFLINE, user.status());
    }

    @Test
    void shouldMarkOnline() {
        User user = User.create("alice", "hash").markOnline();

        assertEquals(UserStatus.ONLINE, user.status());
    }
}