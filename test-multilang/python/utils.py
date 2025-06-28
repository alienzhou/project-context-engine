"""
工具函数模块
"""
import os
import sys
import json
import hashlib
from datetime import datetime, timedelta
from typing import Union, List, Dict, Tuple, Callable
from collections import defaultdict, namedtuple


# 命名元组
UserInfo = namedtuple('UserInfo', ['id', 'name', 'email'])


def hash_password(password: str) -> str:
    """密码哈希"""
    salt = os.urandom(32)
    password_hash = hashlib.pbkdf2_hmac('sha256', 
                                       password.encode('utf-8'), 
                                       salt, 
                                       100000)
    return salt + password_hash


def verify_password(stored_password: bytes, provided_password: str) -> bool:
    """验证密码"""
    salt = stored_password[:32]
    stored_hash = stored_password[32:]
    password_hash = hashlib.pbkdf2_hmac('sha256',
                                       provided_password.encode('utf-8'),
                                       salt,
                                       100000)
    return password_hash == stored_hash


def format_timestamp(timestamp: datetime = None) -> str:
    """格式化时间戳"""
    if timestamp is None:
        timestamp = datetime.now()
    return timestamp.strftime('%Y-%m-%d %H:%M:%S')


def parse_config_file(file_path: str) -> Dict:
    """解析配置文件"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Config file not found: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        if file_path.endswith('.json'):
            return json.load(f)
        else:
            # 简单的键值对解析
            config = {}
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
            return config


def batch_process(items: List, batch_size: int = 100, 
                 processor: Callable = None) -> List:
    """批量处理"""
    if processor is None:
        processor = lambda x: x
    
    results = []
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        batch_results = [processor(item) for item in batch]
        results.extend(batch_results)
    
    return results


def group_by_key(items: List[Dict], key: str) -> Dict[str, List]:
    """按键分组"""
    groups = defaultdict(list)
    for item in items:
        if key in item:
            groups[item[key]].append(item)
    return dict(groups)


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """重试装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(delay)
                    continue
            raise last_exception
        return wrapper
    return decorator


@retry_on_failure(max_retries=3)
def network_request(url: str, timeout: int = 30) -> Dict:
    """网络请求（模拟）"""
    import random
    
    # 模拟网络请求
    if random.random() < 0.3:  # 30% 失败率
        raise ConnectionError("Network request failed")
    
    return {
        'url': url,
        'status': 200,
        'data': f"Response from {url}",
        'timestamp': datetime.now().isoformat()
    }


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_path: str = None):
        """初始化配置管理器"""
        self.config_path = config_path or 'config.json'
        self.config = {}
        self.load_config()
    
    def load_config(self) -> None:
        """加载配置"""
        try:
            self.config = parse_config_file(self.config_path)
        except FileNotFoundError:
            self.config = self.get_default_config()
    
    def get_default_config(self) -> Dict:
        """获取默认配置"""
        return {
            'database': {
                'host': 'localhost',
                'port': 5432,
                'name': 'myapp'
            },
            'logging': {
                'level': 'INFO',
                'file': 'app.log'
            },
            'cache': {
                'ttl': 3600,
                'max_size': 1000
            }
        }
    
    def get(self, key: str, default=None):
        """获取配置值"""
        keys = key.split('.')
        value = self.config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value
    
    def set(self, key: str, value) -> None:
        """设置配置值"""
        keys = key.split('.')
        config = self.config
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value
    
    def save_config(self) -> None:
        """保存配置"""
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)


# 模块级别的变量
DEFAULT_TIMEOUT = 30
MAX_RETRY_COUNT = 3
SUPPORTED_FORMATS = ['json', 'yaml', 'ini', 'env'] 