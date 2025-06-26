#ifndef USER_REPOSITORY_H
#define USER_REPOSITORY_H

#include "User.h"
#include <vector>
#include <optional>
#include <memory>
#include <unordered_map>
#include <functional>

class UserRepository {
public:
    virtual ~UserRepository() = default;
    
    virtual std::optional<User> findById(int id) = 0;
    virtual std::vector<User> findAll() = 0;
    virtual std::vector<User> findByName(const std::string& name) = 0;
    virtual std::vector<User> findByEmail(const std::string& email) = 0;
    virtual std::vector<User> findByFilter(const UserFilter& filter) = 0;
    
    virtual User save(const User& user) = 0;
    virtual void deleteById(int id) = 0;
    virtual bool existsById(int id) = 0;
    virtual size_t count() = 0;
    
    virtual std::vector<User> findActiveUsers() = 0;
    virtual void updateUserStatus(int id, bool active) = 0;
};

class InMemoryUserRepository : public UserRepository {
private:
    std::unordered_map<int, User> users;
    int nextId;
    
public:
    InMemoryUserRepository();
    ~InMemoryUserRepository() override = default;
    
    std::optional<User> findById(int id) override;
    std::vector<User> findAll() override;
    std::vector<User> findByName(const std::string& name) override;
    std::vector<User> findByEmail(const std::string& email) override;
    std::vector<User> findByFilter(const UserFilter& filter) override;
    
    User save(const User& user) override;
    void deleteById(int id) override;
    bool existsById(int id) override;
    size_t count() override;
    
    std::vector<User> findActiveUsers() override;
    void updateUserStatus(int id, bool active) override;
    
    // Additional utility methods
    void clear();
    void loadSampleData();
    
    // Template method for custom filtering
    template<typename Predicate>
    std::vector<User> findWhere(Predicate pred) {
        std::vector<User> result;
        for (const auto& pair : users) {
            if (pred(pair.second)) {
                result.push_back(pair.second);
            }
        }
        return result;
    }
};

// Repository factory
class UserRepositoryFactory {
public:
    enum class RepositoryType {
        IN_MEMORY,
        DATABASE,
        FILE_BASED
    };
    
    static std::unique_ptr<UserRepository> create(RepositoryType type);
    static std::unique_ptr<InMemoryUserRepository> createInMemory();
};

#endif // USER_REPOSITORY_H
