package com.seuprojeto.chat.infrastructure.persistence.user;

import com.seuprojeto.chat.domain.user.UserStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<UserJpaEntity, UUID> {

    Optional<UserJpaEntity> findByUsername(String username);

    List<UserJpaEntity> findByStatus(UserStatus status);
}