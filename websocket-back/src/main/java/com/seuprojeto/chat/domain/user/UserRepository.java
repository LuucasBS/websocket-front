package com.seuprojeto.chat.domain.user;

import java.util.List;
import java.util.Optional;

public interface UserRepository {

    Optional<User> findById(UserId id);

    Optional<User> findByUsername(String username);

    List<User> findOnline();

    User save(User user);
}