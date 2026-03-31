package com.seuprojeto.chat.domain.event;

import com.seuprojeto.chat.domain.user.UserId;
import java.time.Instant;

public record UserConnectedEvent(UserId userId, Instant occurredAt) implements DomainEvent {
}