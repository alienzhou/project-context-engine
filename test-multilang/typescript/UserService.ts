import { IUser, User, BaseUserService, UserRole, UserStatus } from './User';

// 装饰器示例
function logMethod(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyName} with args:`, args);
    const result = method.apply(this, args);
    console.log(`Method ${propertyName} returned:`, result);
    return result;
  };
}

export interface UserServiceConfig {
  maxUsers: number;
  defaultRole: UserRole;
  enableCache: boolean;
}

export type UserFilter = {
  active?: boolean;
  role?: UserRole;
  status?: UserStatus;
  createdAfter?: Date;
  nameContains?: string;
};

export class UserService extends BaseUserService<User> {
  private config: UserServiceConfig;
  private cache: Map<number, User> = new Map();

  constructor(config: UserServiceConfig) {
    super();
    this.config = config;
  }

  @logMethod
  public async findById(id: number): Promise<User | null> {
    if (this.config.enableCache && this.cache.has(id)) {
      return this.cache.get(id) || null;
    }

    const user = this.users.get(id) || null;
    if (user && this.config.enableCache) {
      this.cache.set(id, user);
    }
    return user;
  }

  @logMethod
  public async save(user: User): Promise<User> {
    if (this.users.size >= this.config.maxUsers) {
      throw new Error('Maximum user limit reached');
    }

    if (user.id === 0) {
      user.id = this.generateId();
    }

    this.users.set(user.id, user);
    
    if (this.config.enableCache) {
      this.cache.set(user.id, user);
    }

    return user;
  }

  @logMethod
  public async delete(id: number): Promise<boolean> {
    const deleted = this.users.delete(id);
    if (deleted && this.config.enableCache) {
      this.cache.delete(id);
    }
    return deleted;
  }

  public async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  public async findByFilter(filter: UserFilter): Promise<User[]> {
    const users = Array.from(this.users.values());
    
    return users.filter(user => {
      if (filter.active !== undefined && user.active !== filter.active) {
        return false;
      }
      
      if (filter.createdAfter && user.createdAt <= filter.createdAfter) {
        return false;
      }
      
      if (filter.nameContains && !user.name.toLowerCase().includes(filter.nameContains.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }

  public async count(): Promise<number> {
    return this.users.size;
  }

  public async bulkCreate(userData: Partial<IUser>[]): Promise<User[]> {
    const results: User[] = [];
    
    for (const data of userData) {
      try {
        const user = new User(
          data.id || this.generateId(),
          data.name || '',
          data.email || ''
        );
        await this.save(user);
        results.push(user);
      } catch (error) {
        console.error('Failed to create user:', error);
      }
    }
    
    return results;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getStats() {
    return {
      totalUsers: this.users.size,
      activeUsers: Array.from(this.users.values()).filter(u => u.active).length,
      cacheSize: this.cache.size,
      maxUsers: this.config.maxUsers
    };
  }
}

// 工厂函数
export function createUserService(options?: Partial<UserServiceConfig>): UserService {
  const defaultConfig: UserServiceConfig = {
    maxUsers: 1000,
    defaultRole: UserRole.USER,
    enableCache: true
  };
  
  return new UserService({ ...defaultConfig, ...options });
}

// 高阶函数示例
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3
): T {
  return (async (...args: Parameters<T>) => {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        if (i === maxRetries - 1) {
          throw lastError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }) as T;
}

// 泛型工具函数
export async function processUsers<T>(
  users: User[],
  processor: (user: User) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  
  for (const user of users) {
    const result = await processor(user);
    results.push(result);
  }
  
  return results;
} 