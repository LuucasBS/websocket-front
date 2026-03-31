package com.seuprojeto.chat.infrastructure.persistence.conversation;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationJpaRepository extends JpaRepository<ConversationJpaEntity, UUID> {

    @Query(
        """
        select c from ConversationJpaEntity c
        where (c.userAId = :userA and c.userBId = :userB)
           or (c.userAId = :userB and c.userBId = :userA)
        """
    )
    Optional<ConversationJpaEntity> findByParticipants(@Param("userA") UUID userA, @Param("userB") UUID userB);
}