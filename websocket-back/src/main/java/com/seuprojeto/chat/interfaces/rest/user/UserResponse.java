package com.seuprojeto.chat.interfaces.rest.user;

import java.time.Instant;

public record UserResponse(String id, String username, String status, Instant lastSeen) {
}