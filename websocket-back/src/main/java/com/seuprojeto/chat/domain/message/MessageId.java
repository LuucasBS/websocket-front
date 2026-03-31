package com.seuprojeto.chat.domain.message;

import java.util.UUID;

public record MessageId(UUID value) {

    public static MessageId generate() {
        return new MessageId(UUID.randomUUID());
    }

    public static MessageId of(String value) {
        return new MessageId(UUID.fromString(value));
    }

    @Override
    public String toString() {
        return value.toString();
    }
}