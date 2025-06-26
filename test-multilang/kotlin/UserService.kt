package com.example.service

import com.example.repository.UserRepository
import com.example.model.User

class UserService(private val userRepository: UserRepository) {
    
    fun findById(id: Long): User? {
        return userRepository.findById(id)
    }
    
    fun findAll(): List<User> {
        return userRepository.findAll()
    }
    
    fun createUser(name: String, email: String): User {
        val user = User(name = name, email = email)
        return userRepository.save(user)
    }
    
    fun deleteUser(id: Long): Boolean {
        return if (userRepository.existsById(id)) {
            userRepository.deleteById(id)
            true
        } else {
            false
        }
    }
    
    suspend fun findUserAsync(id: Long): User? {
        return userRepository.findByIdAsync(id)
    }
}
