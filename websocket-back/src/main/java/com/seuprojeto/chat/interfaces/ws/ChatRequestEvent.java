package com.seuprojeto.chat.interfaces.ws;

public record ChatRequestEvent(String type, String fromUserId, String toUserId) implements WsEvent {
}