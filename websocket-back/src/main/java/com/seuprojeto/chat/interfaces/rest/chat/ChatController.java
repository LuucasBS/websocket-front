package com.seuprojeto.chat.interfaces.rest.chat;

import com.seuprojeto.chat.application.chat.ChatApplicationService;
import com.seuprojeto.chat.application.chat.LoadHistoryQuery;
import com.seuprojeto.chat.application.chat.SendMessageCommand;
import com.seuprojeto.chat.domain.conversation.Conversation;
import com.seuprojeto.chat.domain.message.ChatMessage;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ChatController {

    private final ChatApplicationService chatApplicationService;

    public ChatController(ChatApplicationService chatApplicationService) {
        this.chatApplicationService = chatApplicationService;
    }

    @PostMapping("/conversations")
    public ConversationResponse createConversation(@Valid @RequestBody ConversationRequest request) {
        Conversation conversation = chatApplicationService.createOrGetConversation(request.userAId(),
                request.userBId());
        return new ConversationResponse(
                conversation.id().toString(),
                conversation.userAId().toString(),
                conversation.userBId().toString(),
                conversation.createdAt());
    }

    @GetMapping("/conversations/{id}/messages")
    public List<MessageResponse> loadMessages(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return chatApplicationService.load(new LoadHistoryQuery(id, page, size)).stream().map(this::toResponse)
                .toList();
    }

    @PatchMapping("/messages/{id}/read")
    public MessageResponse markRead(@PathVariable String id) {
        return toResponse(chatApplicationService.markRead(id));
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(@Valid @RequestBody MessageRequest request, Principal principal) {
        String fromUserId = principal == null ? "" : principal.getName();
        return toResponse(
                chatApplicationService.send(
                        new SendMessageCommand(request.conversationId(), fromUserId, request.toUserId(),
                                request.content())));
    }

    private MessageResponse toResponse(ChatMessage message) {
        return new MessageResponse(
                message.id().toString(),
                message.conversationId().toString(),
                message.senderId().toString(),
                message.content(),
                message.status().name(),
                message.sentAt());
    }
}