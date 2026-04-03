package com.seuprojeto.chat.infrastructure.persistence.user;

import com.seuprojeto.chat.domain.user.User;
import com.seuprojeto.chat.domain.user.UserId;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface UserMapper {

    @Mapping(target = "passwordHash", source = "password")
    User toDomain(UserJpaEntity entity);

    @Mapping(target = "password", source = "passwordHash")
    UserJpaEntity toEntity(User user);

    default UserId map(UUID value) {
        return value == null ? null : new UserId(value);
    }

    default UUID map(UserId value) {
        return value == null ? null : value.value();
    }
}