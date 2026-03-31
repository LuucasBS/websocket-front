package com.seuprojeto.chat.interfaces.ws;

public record UserStatusEvent(String type, String userId, String status) implements WsEvent {
}