package com.seuprojeto.chat.domain.message;

import com.seuprojeto.chat.domain.conversation.ConversationId;
import com.seuprojeto.chat.domain.user.UserId;
import java.time.Instant;

public record ChatMessage(
    MessageId id,
    ConversationId conversationId,
    UserId senderId,
    String content,
    MessageStatus status,
    Instant sentAt,
    Instant deliveredAt,
    Instant readAt
) {
    public static ChatMessage create(ConversationId conversationId, UserId senderId, String content) {
        return new ChatMessage(
            MessageId.generate(),
            conversationId,
            senderId,
            content,
            MessageStatus.SENT,
            Instant.now(),
            null,
            null
        );
    }

    public ChatMessage markRead() {
        Instant now = Instant.now();
        return new ChatMessage(id, conversationId, senderId, content, MessageStatus.READ, sentAt, deliveredAt, now);
    }
}