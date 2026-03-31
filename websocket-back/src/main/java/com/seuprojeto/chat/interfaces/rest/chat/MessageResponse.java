package com.seuprojeto.chat.interfaces.rest.chat;

import java.time.Instant;

public record MessageResponse(
    String id,
    String conversationId,
    String fromUserId,
    String content,
    String status,
    Instant sentAt
) {
}