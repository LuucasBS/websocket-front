package com.seuprojeto.chat.interfaces.rest.chat;

import jakarta.validation.constraints.NotBlank;

public record ConversationRequest(@NotBlank String userAId, @NotBlank String userBId) {
}