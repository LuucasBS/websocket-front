package com.seuprojeto.chat.interfaces.ws;

public record TypingEvent(String type, String conversationId, String fromUserId, boolean typing) implements WsEvent {
}