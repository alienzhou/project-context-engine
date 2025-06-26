export interface IUser {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  active: boolean;
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
  GUEST = 'guest'
}

export interface UserProfile extends IUser {
  bio?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date;
}

export class User implements IUser {
  public id: number;
  public name: string;
  public email: string;
  public createdAt: Date;
  public active: boolean;

  constructor(id: number, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
    this.active = true;
  }

  public static createGuest(): User {
    return new User(0, 'Guest', 'guest@example.com');
  }

  public isValidEmail(): boolean {
    return this.email.includes('@') && this.email.includes('.');
  }

  public getDisplayName(): string {
    return this.name || 'Unknown User';
  }

  public activate(): void {
    this.active = true;
  }

  public deactivate(): void {
    this.active = false;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      active: this.active
    };
  }
}

export abstract class BaseUserService<T extends IUser> {
  protected users: Map<number, T> = new Map();

  abstract findById(id: number): Promise<T | null>;
  abstract save(user: T): Promise<T>;
  abstract delete(id: number): Promise<boolean>;

  protected generateId(): number {
    return Math.max(0, ...Array.from(this.users.keys())) + 1;
  }
}

export function createUserFromData(data: Partial<IUser>): User {
  if (!data.name || !data.email) {
    throw new Error('Name and email are required');
  }
  
  return new User(
    data.id || 0,
    data.name,
    data.email
  );
}

export const validateUser = (user: IUser): boolean => {
  return !!(user.name && user.email && user.id > 0);
};

export const userUtils = {
  isAdmin: (role: UserRole): boolean => role === UserRole.ADMIN,
  canModerate: (role: UserRole): boolean => [UserRole.ADMIN, UserRole.MODERATOR].includes(role),
  formatUserName: (name: string): string => name.trim().toLowerCase(),
}; 