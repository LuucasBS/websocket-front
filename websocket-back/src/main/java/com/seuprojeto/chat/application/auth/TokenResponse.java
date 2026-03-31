package com.seuprojeto.chat.application.auth;

import com.seuprojeto.chat.domain.user.User;
import java.time.Instant;

public record TokenResponse(String token, Instant expiresAt, User user) {
}