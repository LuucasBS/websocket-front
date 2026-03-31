package com.seuprojeto.chat.application.chat;

public record LoadHistoryQuery(String conversationId, int page, int size) {
}