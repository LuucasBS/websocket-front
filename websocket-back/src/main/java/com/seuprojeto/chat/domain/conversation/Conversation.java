package com.seuprojeto.chat.domain.conversation;

import com.seuprojeto.chat.domain.user.UserId;
import java.time.Instant;

public record Conversation(
    ConversationId id,
    UserId userAId,
    UserId userBId,
    Instant createdAt
) {
    public static Conversation create(UserId userAId, UserId userBId) {
        return new Conversation(ConversationId.generate(), userAId, userBId, Instant.now());
    }
}