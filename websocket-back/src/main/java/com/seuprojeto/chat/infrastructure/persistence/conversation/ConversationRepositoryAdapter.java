package com.seuprojeto.chat.infrastructure.persistence.conversation;

import com.seuprojeto.chat.domain.conversation.Conversation;
import com.seuprojeto.chat.domain.conversation.ConversationId;
import com.seuprojeto.chat.domain.conversation.ConversationRepository;
import com.seuprojeto.chat.domain.user.UserId;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class ConversationRepositoryAdapter implements ConversationRepository {

    private final ConversationJpaRepository conversationJpaRepository;
    private final ConversationMapper conversationMapper;

    public ConversationRepositoryAdapter(
        ConversationJpaRepository conversationJpaRepository,
        ConversationMapper conversationMapper
    ) {
        this.conversationJpaRepository = conversationJpaRepository;
        this.conversationMapper = conversationMapper;
    }

    @Override
    public Optional<Conversation> findById(ConversationId id) {
        return conversationJpaRepository.findById(id.value()).map(conversationMapper::toDomain);
    }

    @Override
    public Optional<Conversation> findByParticipants(UserId userAId, UserId userBId) {
        return conversationJpaRepository.findByParticipants(userAId.value(), userBId.value()).map(conversationMapper::toDomain);
    }

    @Override
    public Conversation save(Conversation conversation) {
        return conversationMapper.toDomain(conversationJpaRepository.save(conversationMapper.toEntity(conversation)));
    }
}