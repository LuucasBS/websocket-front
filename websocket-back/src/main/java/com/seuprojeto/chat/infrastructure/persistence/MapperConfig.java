package com.seuprojeto.chat.infrastructure.persistence;

import com.seuprojeto.chat.infrastructure.persistence.conversation.ConversationMapper;
import com.seuprojeto.chat.infrastructure.persistence.message.MessageMapper;
import com.seuprojeto.chat.infrastructure.persistence.user.UserMapper;
import org.mapstruct.factory.Mappers;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MapperConfig {

    @Bean
    UserMapper userMapper() {
        return Mappers.getMapper(UserMapper.class);
    }

    @Bean
    ConversationMapper conversationMapper() {
        return Mappers.getMapper(ConversationMapper.class);
    }

    @Bean
    MessageMapper messageMapper() {
        return Mappers.getMapper(MessageMapper.class);
    }
}