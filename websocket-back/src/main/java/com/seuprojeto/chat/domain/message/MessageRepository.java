package com.seuprojeto.chat.domain.message;

import com.seuprojeto.chat.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface MessageRepository {

    ChatMessage save(ChatMessage message);

    Optional<ChatMessage> findById(MessageId id);

    List<ChatMessage> findByConversation(ConversationId conversationId, int page, int size);
}