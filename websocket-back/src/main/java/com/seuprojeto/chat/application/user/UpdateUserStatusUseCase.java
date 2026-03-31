package com.seuprojeto.chat.application.user;

public interface UpdateUserStatusUseCase {

    void markOnline(String userId);

    void markOffline(String userId);
}