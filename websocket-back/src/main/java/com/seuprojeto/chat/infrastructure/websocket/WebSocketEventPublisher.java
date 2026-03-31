package com.seuprojeto.chat.infrastructure.websocket;

import com.seuprojeto.chat.domain.event.DomainEvent;
import com.seuprojeto.chat.domain.event.EventPublisher;
import com.seuprojeto.chat.domain.event.MessageSentEvent;
import com.seuprojeto.chat.domain.event.UserConnectedEvent;
import com.seuprojeto.chat.interfaces.ws.MessageEvent;
import com.seuprojeto.chat.interfaces.ws.UserStatusEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class WebSocketEventPublisher implements EventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void publish(DomainEvent event) {
        if (event instanceof MessageSentEvent messageSentEvent) {
            MessageEvent payload = new MessageEvent(
                "MESSAGE",
                messageSentEvent.conversationId(),
                messageSentEvent.fromUserId().toString(),
                messageSentEvent.content(),
                messageSentEvent.occurredAt(),
                messageSentEvent.messageId().toString()
            );
            messagingTemplate.convertAndSendToUser(messageSentEvent.toUserId().toString(), "/queue/messages", payload);
            messagingTemplate.convertAndSendToUser(messageSentEvent.fromUserId().toString(), "/queue/messages", payload);
        }

        if (event instanceof UserConnectedEvent userConnectedEvent) {
            messagingTemplate.convertAndSend(
                "/topic/users.online",
                new UserStatusEvent("USER_STATUS", userConnectedEvent.userId().toString(), "ONLINE")
            );
        }
    }
}