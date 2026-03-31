package com.seuprojeto.chat.domain.event;

import java.time.Instant;

public sealed interface DomainEvent permits MessageSentEvent, UserConnectedEvent {

    Instant occurredAt();
}