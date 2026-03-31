package com.seuprojeto.chat.application.user;

import com.seuprojeto.chat.domain.user.User;
import com.seuprojeto.chat.domain.user.UserId;
import com.seuprojeto.chat.domain.user.UserRepository;
import com.seuprojeto.chat.infrastructure.websocket.OnlineUserRegistry;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class UserStatusApplicationService implements ListOnlineUsersUseCase, UpdateUserStatusUseCase {

    private final UserRepository userRepository;
    private final OnlineUserRegistry onlineUserRegistry;

    public UserStatusApplicationService(UserRepository userRepository, OnlineUserRegistry onlineUserRegistry) {
        this.userRepository = userRepository;
        this.onlineUserRegistry = onlineUserRegistry;
    }

    @Override
    public List<User> listOnline() {
        return userRepository.findOnline();
    }

    @Override
    public void markOnline(String userId) {
        userRepository.findById(UserId.of(userId)).ifPresent(user -> userRepository.save(user.markOnline()));
        onlineUserRegistry.markOnline(userId);
    }

    @Override
    public void markOffline(String userId) {
        userRepository.findById(UserId.of(userId)).ifPresent(user -> userRepository.save(user.markOffline()));
        onlineUserRegistry.markOffline(userId);
    }

    public User getById(String userId) {
        return userRepository.findById(UserId.of(userId)).orElse(null);
    }
}