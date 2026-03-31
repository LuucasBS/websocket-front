package com.seuprojeto.chat.interfaces.ws;

public sealed interface WsEvent permits MessageEvent, TypingEvent, ChatRequestEvent, UserStatusEvent, MessageReadEvent {
}