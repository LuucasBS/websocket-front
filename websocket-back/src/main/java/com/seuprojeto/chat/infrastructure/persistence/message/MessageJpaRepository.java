package com.seuprojeto.chat.infrastructure.persistence.message;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageJpaRepository extends JpaRepository<MessageJpaEntity, UUID> {

    Page<MessageJpaEntity> findByConversationIdOrderBySentAtDesc(UUID conversationId, Pageable pageable);
}