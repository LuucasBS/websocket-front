package com.seuprojeto.chat.infrastructure.persistence.user;

import com.seuprojeto.chat.domain.user.User;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("local")
public class LocalUserSeeder {

    @Bean
    CommandLineRunner seedUsers(UserRepositoryAdapter userRepositoryAdapter, PasswordEncoder passwordEncoder) {
        return args -> {
            seedIfMissing(userRepositoryAdapter, passwordEncoder, "alice", "123456");
            seedIfMissing(userRepositoryAdapter, passwordEncoder, "bob", "123456");
            seedIfMissing(userRepositoryAdapter, passwordEncoder, "carol", "123456");
        };
    }

    private void seedIfMissing(UserRepositoryAdapter userRepositoryAdapter, PasswordEncoder passwordEncoder, String username, String password) {
        userRepositoryAdapter.findByUsername(username).orElseGet(() -> {
            User user = User.create(username, passwordEncoder.encode(password));
            return userRepositoryAdapter.save(user);
        });
    }
}
