package com.seuprojeto.chat.domain.conversation;

import com.seuprojeto.chat.domain.user.UserId;
import java.util.Optional;

public interface ConversationRepository {

    Optional<Conversation> findById(ConversationId id);

    Optional<Conversation> findByParticipants(UserId userAId, UserId userBId);

    Conversation save(Conversation conversation);
}