package com.example.controller;

import com.example.service.UserService;
import com.example.model.User;
import java.util.List;
import java.util.Optional;

public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    public List<User> getAllUsers() {
        return userService.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userService.findById(id);
    }

    public User createUser(String name, String email) {
        return userService.createUser(name, email);
    }

    public boolean deleteUser(Long id) {
        return userService.deleteUser(id);
    }

    public List<User> searchUsersByName(String name) {
        return userService.findByName(name);
    }
}
