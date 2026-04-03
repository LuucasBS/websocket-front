package com.seuprojeto.chat.application.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.seuprojeto.chat.domain.conversation.Conversation;
import com.seuprojeto.chat.domain.conversation.ConversationRepository;
import com.seuprojeto.chat.domain.event.EventPublisher;
import com.seuprojeto.chat.domain.message.ChatMessage;
import com.seuprojeto.chat.domain.message.MessageRepository;
import com.seuprojeto.chat.domain.user.UserId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatApplicationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private EventPublisher eventPublisher;

    private ChatApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ChatApplicationService(conversationRepository, messageRepository, eventPublisher);
    }

    @Test
    void shouldCreateConversationWhenNotFound() {
        UserId userA = UserId.generate();
        UserId userB = UserId.generate();
        UserId first = userA.value().compareTo(userB.value()) <= 0 ? userA : userB;
        UserId second = userA.value().compareTo(userB.value()) <= 0 ? userB : userA;

        when(conversationRepository.findByParticipants(first, second)).thenReturn(Optional.empty());
        when(conversationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Conversation result = service.createOrGetConversation(userA.toString(), userB.toString());

        assertEquals(first, result.userAId());
        assertEquals(second, result.userBId());
        verify(conversationRepository).save(any());
    }

    @Test
    void shouldSendMessageAndPublishEvent() {
        SendMessageCommand command = new SendMessageCommand(
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
            "33333333-3333-3333-3333-333333333333",
            "oi"
        );

        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatMessage result = service.send(command);

        assertEquals("oi", result.content());
        verify(eventPublisher).publish(any());
    }
}