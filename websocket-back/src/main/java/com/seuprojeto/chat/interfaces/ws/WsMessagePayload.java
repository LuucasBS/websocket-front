package com.seuprojeto.chat.interfaces.ws;

import jakarta.validation.constraints.NotBlank;

public record WsMessagePayload(@NotBlank String conversationId, @NotBlank String toUserId, @NotBlank String content) {
}