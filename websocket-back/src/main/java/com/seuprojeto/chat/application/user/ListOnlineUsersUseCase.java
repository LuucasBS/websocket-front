package com.seuprojeto.chat.application.user;

import com.seuprojeto.chat.domain.user.User;
import java.util.List;

public interface ListOnlineUsersUseCase {

    List<User> listOnline();
}