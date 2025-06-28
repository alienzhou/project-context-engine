"""
用户服务模块
"""
from typing import List, Optional, Dict, Any
from functools import wraps
import logging
from user import User


def log_method_call(func):
    """记录方法调用的装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        logging.info(f"Calling {func.__name__} with args: {args[1:]} kwargs: {kwargs}")
        result = func(*args, **kwargs)
        logging.info(f"Method {func.__name__} completed")
        return result
    return wrapper


class UserService:
    """用户服务类"""
    
    def __init__(self, database_connection):
        """初始化服务"""
        self.db = database_connection
        self.cache = {}
        self.logger = logging.getLogger(__name__)
    
    @log_method_call
    def create_user(self, username: str, email: str) -> User:
        """创建新用户"""
        user_id = self._generate_user_id()
        user = User(user_id, username, email)
        self._save_to_database(user)
        self.cache[user_id] = user
        return user
    
    @log_method_call
    def get_user(self, user_id: int) -> Optional[User]:
        """获取用户"""
        if user_id in self.cache:
            return self.cache[user_id]
        
        user = self._load_from_database(user_id)
        if user:
            self.cache[user_id] = user
        return user
    
    @log_method_call
    def update_user(self, user_id: int, **kwargs) -> bool:
        """更新用户信息"""
        user = self.get_user(user_id)
        if not user:
            return False
        
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        self._save_to_database(user)
        return True
    
    @log_method_call
    def delete_user(self, user_id: int) -> bool:
        """删除用户"""
        if user_id in self.cache:
            del self.cache[user_id]
        return self._delete_from_database(user_id)
    
    def get_all_users(self, active_only: bool = True) -> List[User]:
        """获取所有用户"""
        users = self._load_all_from_database()
        if active_only:
            users = [user for user in users if user.is_active]
        return users
    
    def _generate_user_id(self) -> int:
        """生成用户ID"""
        # 简单的ID生成逻辑
        return len(self.cache) + 1
    
    def _save_to_database(self, user: User) -> None:
        """保存到数据库"""
        # 模拟数据库保存
        self.logger.info(f"Saving user {user.user_id} to database")
    
    def _load_from_database(self, user_id: int) -> Optional[User]:
        """从数据库加载"""
        # 模拟数据库加载
        self.logger.info(f"Loading user {user_id} from database")
        return None
    
    def _load_all_from_database(self) -> List[User]:
        """从数据库加载所有用户"""
        # 模拟数据库加载
        return []
    
    def _delete_from_database(self, user_id: int) -> bool:
        """从数据库删除"""
        # 模拟数据库删除
        self.logger.info(f"Deleting user {user_id} from database")
        return True


# 全局函数
def initialize_service(db_config: Dict[str, Any]) -> UserService:
    """初始化用户服务"""
    # 模拟数据库连接
    db_connection = f"Connection to {db_config.get('host', 'localhost')}"
    return UserService(db_connection)


async def async_process_users(users: List[User]) -> Dict[str, int]:
    """异步处理用户"""
    import asyncio
    
    async def process_user(user: User) -> str:
        # 模拟异步处理
        await asyncio.sleep(0.1)
        return user.get_display_name()
    
    tasks = [process_user(user) for user in users]
    results = await asyncio.gather(*tasks)
    
    return {
        'processed_count': len(results),
        'active_count': sum(1 for user in users if user.is_active)
    } 