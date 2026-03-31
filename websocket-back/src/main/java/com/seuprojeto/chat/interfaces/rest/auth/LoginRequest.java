package com.seuprojeto.chat.interfaces.rest.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(@NotBlank String username, @NotBlank @Size(min = 6) String password) {
}