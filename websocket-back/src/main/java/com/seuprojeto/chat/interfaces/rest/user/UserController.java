package com.seuprojeto.chat.interfaces.rest.user;

import com.seuprojeto.chat.application.user.UserStatusApplicationService;
import com.seuprojeto.chat.domain.user.User;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserStatusApplicationService userStatusApplicationService;

    public UserController(UserStatusApplicationService userStatusApplicationService) {
        this.userStatusApplicationService = userStatusApplicationService;
    }

    @GetMapping("/online")
    public List<UserResponse> listOnline() {
        return userStatusApplicationService.listOnline().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable String id) {
        User user = userStatusApplicationService.getById(id);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario nao encontrado");
        }
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.id().toString(), user.username(), user.status().name(), user.lastSeen());
    }
}