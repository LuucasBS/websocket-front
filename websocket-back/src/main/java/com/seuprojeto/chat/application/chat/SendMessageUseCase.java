package com.seuprojeto.chat.application.chat;

import com.seuprojeto.chat.domain.message.ChatMessage;

public interface SendMessageUseCase {

    ChatMessage send(SendMessageCommand command);
}