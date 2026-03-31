package com.seuprojeto.chat.domain.event;

import com.seuprojeto.chat.domain.message.MessageId;
import com.seuprojeto.chat.domain.user.UserId;
import java.time.Instant;

public record MessageSentEvent(
    MessageId messageId,
    String conversationId,
    UserId fromUserId,
    UserId toUserId,
    String content,
    Instant occurredAt
) implements DomainEvent {
}