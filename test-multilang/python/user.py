"""
用户模型类
"""
import datetime
from typing import Optional, List


class User:
    """用户类"""
    
    def __init__(self, user_id: int, username: str, email: str):
        """初始化用户"""
        self.user_id = user_id
        self.username = username
        self.email = email
        self.created_at = datetime.datetime.now()
        self.is_active = True
    
    def get_display_name(self) -> str:
        """获取显示名称"""
        return f"{self.username} ({self.email})"
    
    def activate(self) -> None:
        """激活用户"""
        self.is_active = True
    
    def deactivate(self) -> None:
        """停用用户"""
        self.is_active = False
    
    @classmethod
    def create_from_dict(cls, data: dict) -> 'User':
        """从字典创建用户"""
        return cls(
            user_id=data['user_id'],
            username=data['username'],
            email=data['email']
        )
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """验证邮箱格式"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None


def create_admin_user(username: str) -> User:
    """创建管理员用户"""
    return User(
        user_id=1,
        username=username,
        email=f"{username}@admin.com"
    )


def get_users_by_status(users: List[User], is_active: bool = True) -> List[User]:
    """根据状态获取用户列表"""
    return [user for user in users if user.is_active == is_active] 