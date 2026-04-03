package com.seuprojeto.chat.infrastructure.persistence.message;

import com.seuprojeto.chat.domain.conversation.ConversationId;
import com.seuprojeto.chat.domain.message.ChatMessage;
import com.seuprojeto.chat.domain.message.MessageId;
import com.seuprojeto.chat.domain.user.UserId;
import java.util.UUID;
import org.mapstruct.Mapper;

@Mapper
public interface MessageMapper {

    ChatMessage toDomain(MessageJpaEntity entity);

    MessageJpaEntity toEntity(ChatMessage message);

    default MessageId mapMessageId(UUID value) {
        return value == null ? null : new MessageId(value);
    }

    default UUID mapMessageId(MessageId value) {
        return value == null ? null : value.value();
    }

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