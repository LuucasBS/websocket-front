package com.seuprojeto.chat.interfaces.ws;

import java.time.Instant;

public record WsNotificationPayload(
    String type,
    String fromUsername,
    String conversationId,
    String preview,
    int unreadCount,
    Instant timestamp
) {
}