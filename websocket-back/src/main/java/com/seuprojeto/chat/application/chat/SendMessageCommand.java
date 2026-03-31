package com.seuprojeto.chat.application.chat;

public record SendMessageCommand(String conversationId, String fromUserId, String toUserId, String content) {
}