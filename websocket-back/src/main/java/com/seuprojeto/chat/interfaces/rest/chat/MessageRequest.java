package com.seuprojeto.chat.interfaces.rest.chat;

import jakarta.validation.constraints.NotBlank;

public record MessageRequest(@NotBlank String conversationId, @NotBlank String toUserId, @NotBlank String content) {
}