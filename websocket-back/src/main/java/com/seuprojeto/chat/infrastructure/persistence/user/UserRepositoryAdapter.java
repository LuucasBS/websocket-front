package com.seuprojeto.chat.infrastructure.persistence.user;

import com.seuprojeto.chat.domain.user.User;
import com.seuprojeto.chat.domain.user.UserId;
import com.seuprojeto.chat.domain.user.UserRepository;
import com.seuprojeto.chat.domain.user.UserStatus;
import java.util.List;
import java.util.Optional;
public class UserRepositoryAdapter implements UserRepository {

    private final UserJpaRepository userJpaRepository;
    private final UserMapper userMapper;

    public UserRepositoryAdapter(UserJpaRepository userJpaRepository, UserMapper userMapper) {
        this.userJpaRepository = userJpaRepository;
        this.userMapper = userMapper;
    }

    @Override
    public Optional<User> findById(UserId id) {
        return userJpaRepository.findById(id.value()).map(userMapper::toDomain);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return userJpaRepository.findByUsername(username).map(userMapper::toDomain);
    }

    @Override
    public List<User> findOnline() {
        return userJpaRepository.findByStatus(UserStatus.ONLINE).stream().map(userMapper::toDomain).toList();
    }

    @Override
    public User save(User user) {
        return userMapper.toDomain(userJpaRepository.save(userMapper.toEntity(user)));
    }
}