#ifndef USER_H
#define USER_H

#include <string>
#include <chrono>
#include <memory>

class User {
private:
    int id;
    std::string name;
    std::string email;
    std::chrono::system_clock::time_point createdAt;
    bool active;

public:
    User();
    User(const std::string& name, const std::string& email);
    User(int id, const std::string& name, const std::string& email);
    
    // Copy constructor and assignment operator
    User(const User& other);
    User& operator=(const User& other);
    
    // Move constructor and assignment operator
    User(User&& other) noexcept;
    User& operator=(User&& other) noexcept;
    
    // Destructor
    ~User();

    // Getters
    int getId() const;
    const std::string& getName() const;
    const std::string& getEmail() const;
    const std::chrono::system_clock::time_point& getCreatedAt() const;
    bool isActive() const;

    // Setters
    void setId(int id);
    void setName(const std::string& name);
    void setEmail(const std::string& email);
    void setActive(bool active);

    // Utility methods
    bool isValidEmail() const;
    std::string getDisplayName() const;
    void activate();
    void deactivate();
    
    // Static factory methods
    static User createGuest();
    static std::unique_ptr<User> createUniqueUser(const std::string& name, const std::string& email);
    
    // Operators
    bool operator==(const User& other) const;
    bool operator!=(const User& other) const;
    bool operator<(const User& other) const;
    
    // Friend function for output
    friend std::ostream& operator<<(std::ostream& os, const User& user);
};

enum class UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED,
    PENDING
};

struct UserFilter {
    std::optional<bool> active;
    std::optional<int> minId;
    std::optional<int> maxId;
    std::string nameLike;
    
    bool matches(const User& user) const;
};

#endif // USER_H
