package com.example.repository;

import com.example.model.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {
    
    Optional<User> findById(Long id);
    
    List<User> findAll();
    
    List<User> findByName(String name);
    
    List<User> findByEmail(String email);
    
    User save(User user);
    
    void deleteById(Long id);
    
    boolean existsById(Long id);
    
    long count();
    
    List<User> findActiveUsers();
    
    void updateUserStatus(Long id, boolean active);
}
