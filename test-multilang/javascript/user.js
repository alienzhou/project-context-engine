// ES6+ JavaScript 用户模型示例

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
  GUEST: 'guest'
};

export class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
    this.active = true;
    this.role = UserRole.USER;
    this.status = UserStatus.ACTIVE;
  }

  static createGuest() {
    const guest = new User(0, 'Guest', 'guest@example.com');
    guest.role = UserRole.GUEST;
    return guest;
  }

  static fromJSON(data) {
    const user = new User(data.id, data.name, data.email);
    Object.assign(user, {
      createdAt: new Date(data.createdAt),
      active: data.active,
      role: data.role || UserRole.USER,
      status: data.status || UserStatus.ACTIVE
    });
    return user;
  }

  isValidEmail() {
    return this.email.includes('@') && this.email.includes('.');
  }

  getDisplayName() {
    return this.name || 'Unknown User';
  }

  activate() {
    this.active = true;
    this.status = UserStatus.ACTIVE;
  }

  deactivate() {
    this.active = false;
    this.status = UserStatus.INACTIVE;
  }

  suspend() {
    this.active = false;
    this.status = UserStatus.SUSPENDED;
  }

  hasRole(role) {
    return this.role === role;
  }

  isAdmin() {
    return this.role === UserRole.ADMIN;
  }

  canModerate() {
    return [UserRole.ADMIN, UserRole.MODERATOR].includes(this.role);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      active: this.active,
      role: this.role,
      status: this.status
    };
  }

  toString() {
    return `User(${this.id}, ${this.name}, ${this.email})`;
  }

  // Getter 和 Setter
  get fullInfo() {
    return `${this.name} (${this.email}) - ${this.status}`;
  }

  set userRole(role) {
    if (Object.values(UserRole).includes(role)) {
      this.role = role;
    } else {
      throw new Error(`Invalid role: ${role}`);
    }
  }

  get userRole() {
    return this.role;
  }
}

// 工厂函数
export function createUser(userData) {
  const { id, name, email, ...rest } = userData;
  
  if (!name || !email) {
    throw new Error('Name and email are required');
  }
  
  const user = new User(id || 0, name, email);
  Object.assign(user, rest);
  
  return user;
}

// 高阶函数示例
export const userOperations = {
  // 过滤用户
  filterUsers: (users, predicate) => users.filter(predicate),
  
  // 映射用户数据
  mapUsers: (users, mapper) => users.map(mapper),
  
  // 查找用户
  findUser: (users, predicate) => users.find(predicate),
  
  // 分组用户
  groupUsersByRole: (users) => {
    return users.reduce((groups, user) => {
      const role = user.role;
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(user);
      return groups;
    }, {});
  },
  
  // 排序用户
  sortUsers: (users, sortBy = 'name') => {
    return [...users].sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return -1;
      if (a[sortBy] > b[sortBy]) return 1;
      return 0;
    });
  }
};

// 箭头函数示例
export const validateUser = (user) => {
  return !!(user && user.name && user.email && user.id > 0);
};

export const formatUserName = (name) => {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
};

export const isActiveUser = (user) => user.active && user.status === UserStatus.ACTIVE;

export const getUserAge = (user) => {
  const now = new Date();
  const created = new Date(user.createdAt);
  return Math.floor((now - created) / (1000 * 60 * 60 * 24)); // 天数
};

// 异步函数示例
export async function loadUserData(userId) {
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      createdAt: new Date().toISOString(),
      active: true
    };
  } catch (error) {
    console.error('Failed to load user data:', error);
    throw error;
  }
}

export async function saveUserData(user) {
  try {
    // 验证用户数据
    if (!validateUser(user)) {
      throw new Error('Invalid user data');
    }
    
    // 模拟保存操作
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return { ...user, updatedAt: new Date().toISOString() };
  } catch (error) {
    console.error('Failed to save user data:', error);
    throw error;
  }
}

// 默认导出
export default User; 