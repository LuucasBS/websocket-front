package com.seuprojeto.chat.infrastructure.persistence.conversation;

import com.seuprojeto.chat.domain.conversation.Conversation;
import com.seuprojeto.chat.domain.conversation.ConversationId;
import com.seuprojeto.chat.domain.user.UserId;
import java.util.UUID;
import org.mapstruct.Mapper;

@Mapper
public interface ConversationMapper {

    Conversation toDomain(ConversationJpaEntity entity);

    ConversationJpaEntity toEntity(Conversation conversation);

    default ConversationId mapConversationId(UUID value) {
        return value == null ? null : new ConversationId(value);
    }

    default UUID mapConversationId(ConversationId value) {
        return value == null ? null : value.value();
    }

    default UserId mapUserId(UUID value) {
        return value == null ? null : new UserId(value);
    }

    default UUID mapUserId(UserId value) {
        return value == null ? null : value.value();
    }
}