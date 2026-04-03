package com.seuprojeto.chat.infrastructure.persistence.user;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserRepositoryConfig {

    @Bean
    UserRepositoryAdapter userRepositoryAdapter(UserJpaRepository userJpaRepository, UserMapper userMapper) {
        return new UserRepositoryAdapter(userJpaRepository, userMapper);
    }
}
