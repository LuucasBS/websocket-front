package com.seuprojeto.chat.interfaces.rest.auth;

import com.seuprojeto.chat.application.auth.AuthApplicationService;
import com.seuprojeto.chat.application.auth.LoginCommand;
import com.seuprojeto.chat.application.auth.TokenResponse;
import com.seuprojeto.chat.domain.user.User;
import com.seuprojeto.chat.interfaces.rest.user.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthApplicationService authApplicationService;

    public AuthController(AuthApplicationService authApplicationService) {
        this.authApplicationService = authApplicationService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokenResponse = authApplicationService.login(new LoginCommand(request.username(), request.password()));
        return new LoginResponse(tokenResponse.token(), tokenResponse.expiresAt(), toUserResponse(tokenResponse.user()));
    }

    @PostMapping("/refresh")
    public RefreshResponse refresh(@RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken) {
        TokenResponse tokenResponse = authApplicationService.refresh(bearerToken);
        return new RefreshResponse(tokenResponse.token(), tokenResponse.expiresAt());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String bearerToken) {
        authApplicationService.logoutByToken(bearerToken);
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.id().toString(), user.username(), user.status().name(), user.lastSeen());
    }
}