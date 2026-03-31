package com.seuprojeto.chat.application.chat;

import com.seuprojeto.chat.domain.message.ChatMessage;
import java.util.List;

public interface LoadHistoryUseCase {

    List<ChatMessage> load(LoadHistoryQuery query);
}