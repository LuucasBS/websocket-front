package com.seuprojeto.chat.application.auth;

import com.seuprojeto.chat.domain.user.User;
import com.seuprojeto.chat.domain.user.UserId;
import com.seuprojeto.chat.domain.user.UserRepository;
import com.seuprojeto.chat.infrastructure.security.JwtTokenProvider;
import com.seuprojeto.chat.infrastructure.security.TokenBlacklistService;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthApplicationService implements AuthUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;

    public AuthApplicationService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtTokenProvider jwtTokenProvider,
        TokenBlacklistService tokenBlacklistService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    @Override
    public TokenResponse login(LoginCommand command) {
        User user = userRepository
            .findByUsername(command.username())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais invalidas"));

        if (!passwordEncoder.matches(command.password(), user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais invalidas");
        }

        User onlineUser = userRepository.save(user.markOnline());
        String token = jwtTokenProvider.generateToken(onlineUser);
        Instant expiresAt = jwtTokenProvider.extractExpiration(token);
        return new TokenResponse(token, expiresAt, onlineUser);
    }

    @Override
    public TokenResponse refresh(String bearerToken) {
        String token = JwtTokenProvider.stripBearerPrefix(bearerToken);
        if (!jwtTokenProvider.validateToken(token) || tokenBlacklistService.isBlacklisted(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalido");
        }

        User user = userRepository
            .findById(UserId.of(jwtTokenProvider.extractUserId(token)))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario invalido"));

        String refreshedToken = jwtTokenProvider.generateToken(user);
        return new TokenResponse(refreshedToken, jwtTokenProvider.extractExpiration(refreshedToken), user);
    }

    @Override
    public void logout(String userId) {
        userRepository.findById(UserId.of(userId)).ifPresent(user -> userRepository.save(user.markOffline()));
    }

    public void logoutByToken(String bearerToken) {
        String token = JwtTokenProvider.stripBearerPrefix(bearerToken);
        tokenBlacklistService.blacklist(token, jwtTokenProvider.secondsUntilExpiration(token));
        logout(jwtTokenProvider.extractUserId(token));
    }
}