package com.seuprojeto.chat.interfaces.ws;

public record MessageReadEvent(String type, String messageId, String conversationId, String readerUserId) implements WsEvent {
}