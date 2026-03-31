package com.seuprojeto.chat.interfaces.rest.auth;

import java.time.Instant;

public record RefreshResponse(String token, Instant expiresAt) {
}