import User, { UserStatus, UserRole, validateUser } from './user.js';

// 事件发射器模式
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
  }
}

export class UserService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.users = new Map();
    this.config = {
      maxUsers: 1000,
      enableLogging: true,
      autoSave: false,
      ...options
    };
    this.nextId = 1;
  }

  // 私有方法（使用 # 语法在现代浏览器中）
  _generateId() {
    return this.nextId++;
  }

  _log(message, data = null) {
    if (this.config.enableLogging) {
      console.log(`[UserService] ${message}`, data || '');
    }
  }

  _validateUser(user) {
    if (!validateUser(user)) {
      throw new Error('Invalid user data');
    }
  }

  async create(userData) {
    try {
      this._log('Creating new user', userData);
      
      if (this.users.size >= this.config.maxUsers) {
        throw new Error('Maximum user limit reached');
      }

      const user = new User(
        userData.id || this._generateId(),
        userData.name,
        userData.email
      );

      // 应用额外属性
      Object.assign(user, {
        role: userData.role || UserRole.USER,
        status: userData.status || UserStatus.ACTIVE
      });

      this._validateUser(user);
      this.users.set(user.id, user);

      this.emit('userCreated', user);
      this._log('User created successfully', user.id);

      if (this.config.autoSave) {
        await this._autoSave();
      }

      return user;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async findById(id) {
    this._log('Finding user by ID', id);
    const user = this.users.get(id);
    
    if (user) {
      this.emit('userFound', user);
    }
    
    return user || null;
  }

  async findAll(filter = {}) {
    this._log('Finding all users', filter);
    let users = Array.from(this.users.values());

    // 应用过滤器
    if (filter.active !== undefined) {
      users = users.filter(user => user.active === filter.active);
    }

    if (filter.role) {
      users = users.filter(user => user.role === filter.role);
    }

    if (filter.status) {
      users = users.filter(user => user.status === filter.status);
    }

    if (filter.nameContains) {
      users = users.filter(user => 
        user.name.toLowerCase().includes(filter.nameContains.toLowerCase())
      );
    }

    // 应用排序
    if (filter.sortBy) {
      users.sort((a, b) => {
        const aVal = a[filter.sortBy];
        const bVal = b[filter.sortBy];
        return filter.sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });
    }

    // 应用分页
    if (filter.limit) {
      const start = (filter.page || 0) * filter.limit;
      users = users.slice(start, start + filter.limit);
    }

    return users;
  }

  async update(id, updates) {
    try {
      this._log('Updating user', { id, updates });
      
      const user = this.users.get(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      const oldUser = { ...user };
      Object.assign(user, updates);
      this._validateUser(user);

      this.emit('userUpdated', user, oldUser);
      this._log('User updated successfully', id);

      if (this.config.autoSave) {
        await this._autoSave();
      }

      return user;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      this._log('Deleting user', id);
      
      const user = this.users.get(id);
      if (!user) {
        return false;
      }

      this.users.delete(id);
      this.emit('userDeleted', user);
      this._log('User deleted successfully', id);

      if (this.config.autoSave) {
        await this._autoSave();
      }

      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async bulkCreate(usersData) {
    const results = [];
    const errors = [];

    for (const userData of usersData) {
      try {
        const user = await this.create(userData);
        results.push(user);
      } catch (error) {
        errors.push({ userData, error: error.message });
      }
    }

    return { results, errors };
  }

  async count(filter = {}) {
    const users = await this.findAll(filter);
    return users.length;
  }

  async getStats() {
    const all = await this.findAll();
    const active = await this.findAll({ active: true });
    const byRole = {};
    const byStatus = {};

    all.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
      byStatus[user.status] = (byStatus[user.status] || 0) + 1;
    });

    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      byRole,
      byStatus,
      maxUsers: this.config.maxUsers
    };
  }

  async _autoSave() {
    // 模拟自动保存
    this._log('Auto-saving users data');
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // 导出/导入功能
  exportData() {
    const users = Array.from(this.users.values());
    return {
      users: users.map(user => user.toJSON()),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  async importData(data) {
    try {
      this._log('Importing users data');
      
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error('Invalid import data format');
      }

      this.users.clear();
      let imported = 0;

      for (const userData of data.users) {
        try {
          const user = User.fromJSON(userData);
          this.users.set(user.id, user);
          imported++;
        } catch (error) {
          this._log('Failed to import user', { userData, error: error.message });
        }
      }

      this.emit('dataImported', { imported, total: data.users.length });
      this._log('Data import completed', { imported, total: data.users.length });

      return { imported, total: data.users.length };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // 清理功能
  clear() {
    this.users.clear();
    this.nextId = 1;
    this.emit('cleared');
    this._log('All users cleared');
  }

  // 销毁服务
  destroy() {
    this.clear();
    this.events = {};
    this._log('UserService destroyed');
  }
}

// 工厂函数
export function createUserService(options) {
  return new UserService(options);
}

// 单例模式
let defaultServiceInstance = null;

export function getDefaultUserService() {
  if (!defaultServiceInstance) {
    defaultServiceInstance = new UserService();
  }
  return defaultServiceInstance;
}

// 装饰器函数（高阶函数）
export function withRetry(fn, maxRetries = 3, delay = 1000) {
  return async function(...args) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  };
}

export function withLogging(fn) {
  return function(...args) {
    console.log(`Calling ${fn.name} with args:`, args);
    const result = fn.apply(this, args);
    
    if (result instanceof Promise) {
      return result.then(res => {
        console.log(`${fn.name} resolved with:`, res);
        return res;
      }).catch(err => {
        console.error(`${fn.name} rejected with:`, err);
        throw err;
      });
    } else {
      console.log(`${fn.name} returned:`, result);
      return result;
    }
  };
}

// 工具函数
export const userServiceUtils = {
  // 验证配置
  validateConfig: (config) => {
    const requiredKeys = ['maxUsers'];
    const missingKeys = requiredKeys.filter(key => !(key in config));
    
    if (missingKeys.length > 0) {
      throw new Error(`Missing required config keys: ${missingKeys.join(', ')}`);
    }
    
    if (config.maxUsers <= 0) {
      throw new Error('maxUsers must be greater than 0');
    }
    
    return true;
  },

  // 生成测试数据
  generateTestUsers: (count = 10) => {
    return Array.from({ length: count }, (_, i) => ({
      name: `Test User ${i + 1}`,
      email: `test${i + 1}@example.com`,
      role: i === 0 ? UserRole.ADMIN : UserRole.USER,
      status: UserStatus.ACTIVE
    }));
  }
};

export default UserService; 