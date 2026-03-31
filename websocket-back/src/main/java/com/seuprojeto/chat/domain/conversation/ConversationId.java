package com.seuprojeto.chat.domain.conversation;

import java.util.UUID;

public record ConversationId(UUID value) {

    public static ConversationId generate() {
        return new ConversationId(UUID.randomUUID());
    }

    public static ConversationId of(String value) {
        return new ConversationId(UUID.fromString(value));
    }

    @Override
    public String toString() {
        return value.toString();
    }
}