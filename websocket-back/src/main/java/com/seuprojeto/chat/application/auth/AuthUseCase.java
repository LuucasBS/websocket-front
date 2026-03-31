package com.seuprojeto.chat.application.auth;

public interface AuthUseCase {

    TokenResponse login(LoginCommand command);

    TokenResponse refresh(String bearerToken);

    void logout(String userId);
}