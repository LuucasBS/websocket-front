package com.seuprojeto.chat.interfaces.rest.chat;

import java.time.Instant;

public record ConversationResponse(String id, String userAId, String userBId, Instant createdAt) {
}