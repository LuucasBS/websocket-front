package com.seuprojeto.chat.domain.event;

public interface EventPublisher {

    void publish(DomainEvent event);
}