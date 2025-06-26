package com.example.repository

import com.example.model.User
import com.example.model.UserStatus

interface UserRepository {
    suspend fun findById(id: Long): User?
    
    suspend fun findByIdAsync(id: Long): User?
    
    suspend fun findAll(): List<User>
    
    suspend fun findByStatus(status: UserStatus): List<User>
    
    suspend fun save(user: User): User
    
    suspend fun deleteById(id: Long): Boolean
    
    suspend fun existsById(id: Long): Boolean
    
    suspend fun count(): Long
}

class InMemoryUserRepository : UserRepository {
    private val users = mutableMapOf<Long, User>()
    private var nextId = 1L
    
    override suspend fun findById(id: Long): User? {
        return users[id]
    }
    
    override suspend fun findByIdAsync(id: Long): User? {
        return findById(id)
    }
    
    override suspend fun findAll(): List<User> {
        return users.values.toList()
    }
    
    override suspend fun findByStatus(status: UserStatus): List<User> {
        return users.values.filter { it.active == (status == UserStatus.ACTIVE) }
    }
    
    override suspend fun save(user: User): User {
        val savedUser = if (user.id == null) {
            user.copy(id = nextId++)
        } else {
            user
        }
        users[savedUser.id!!] = savedUser
        return savedUser
    }
    
    override suspend fun deleteById(id: Long): Boolean {
        return users.remove(id) != null
    }
    
    override suspend fun existsById(id: Long): Boolean {
        return users.containsKey(id)
    }
    
    override suspend fun count(): Long {
        return users.size.toLong()
    }
}
