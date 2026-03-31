package com.seuprojeto.chat.infrastructure.persistence.message;

import com.seuprojeto.chat.domain.conversation.ConversationId;
import com.seuprojeto.chat.domain.message.ChatMessage;
import com.seuprojeto.chat.domain.message.MessageId;
import com.seuprojeto.chat.domain.message.MessageRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
public class MessageRepositoryAdapter implements MessageRepository {

    private final MessageJpaRepository messageJpaRepository;
    private final MessageMapper messageMapper;

    public MessageRepositoryAdapter(MessageJpaRepository messageJpaRepository, MessageMapper messageMapper) {
        this.messageJpaRepository = messageJpaRepository;
        this.messageMapper = messageMapper;
    }

    @Override
    public ChatMessage save(ChatMessage message) {
        return messageMapper.toDomain(messageJpaRepository.save(messageMapper.toEntity(message)));
    }

    @Override
    public Optional<ChatMessage> findById(MessageId id) {
        return messageJpaRepository.findById(id.value()).map(messageMapper::toDomain);
    }

    @Override
    public List<ChatMessage> findByConversation(ConversationId conversationId, int page, int size) {
        return messageJpaRepository
            .findByConversationIdOrderBySentAtDesc(conversationId.value(), PageRequest.of(page, size))
            .stream()
            .map(messageMapper::toDomain)
            .toList();
    }
}