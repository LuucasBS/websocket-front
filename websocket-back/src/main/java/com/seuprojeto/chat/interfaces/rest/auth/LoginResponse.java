package com.seuprojeto.chat.interfaces.rest.auth;

import com.seuprojeto.chat.interfaces.rest.user.UserResponse;
import java.time.Instant;

public record LoginResponse(String token, Instant expiresAt, UserResponse user) {
}