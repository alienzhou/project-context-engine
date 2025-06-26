#include <iostream>
#include <vector>
#include <optional>
#include <string>

class UserService {
private:
    UserRepository* userRepository;

public:
    UserService(UserRepository* repo) : userRepository(repo) {}

    std::optional<User> findById(int id) {
        return userRepository->findById(id);
    }

    std::vector<User> findAll() {
        return userRepository->findAll();
    }

    User createUser(const std::string& name, const std::string& email) {
        User user(name, email);
        return userRepository->save(user);
    }

    bool deleteUser(int id) {
        if (userRepository->existsById(id)) {
            userRepository->deleteById(id);
            return true;
        }
        return false;
    }
};
