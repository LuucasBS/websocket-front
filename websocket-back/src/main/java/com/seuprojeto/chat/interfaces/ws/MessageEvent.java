package com.seuprojeto.chat.interfaces.ws;

import java.time.Instant;

public record MessageEvent(
    String type,
    String conversationId,
    String fromUserId,
    String content,
    Instant sentAt,
    String messageId
) implements WsEvent {
}