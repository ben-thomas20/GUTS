#pragma once

#include <string>
#include <nlohmann/json.hpp>

namespace guts {

struct Player {
    std::string id;
    std::string token;
    std::string name;
    double balance;
    double buyInAmount;
    bool isHost;
    bool isActive;
    std::string socketId;
    
    nlohmann::json toJson() const {
        return {
            {"id", id},
            {"name", name},
            {"balance", balance},
            {"buyInAmount", buyInAmount},
            {"isHost", isHost},
            {"isActive", isActive}
        };
    }
};

} // namespace guts

