package com.example.model

import java.time.LocalDateTime

data class User(
    val id: Long? = null,
    val name: String,
    val email: String,
    val createdAt: LocalDateTime = LocalDateTime.now(),
    val active: Boolean = true
) {
    fun isValidEmail(): Boolean {
        return email.contains("@") && email.contains(".")
    }
    
    fun getDisplayName(): String {
        return if (name.isNotBlank()) name else "Unknown User"
    }
    
    companion object {
        fun createGuest(): User {
            return User(name = "Guest", email = "guest@example.com", active = false)
        }
        
        fun isValidId(id: Long?): Boolean {
            return id != null && id > 0
        }
    }
}

enum class UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED,
    PENDING
}

data class UserProfile(
    val user: User,
    val bio: String? = null,
    val avatarUrl: String? = null,
    val preferences: Map<String, Any> = emptyMap()
)
