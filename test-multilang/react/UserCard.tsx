import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// 类型定义
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: number) => void;
  onStatusChange?: (userId: number, status: User['status']) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

// 自定义 Hook
function useUserActions(user: User, onEdit?: (user: User) => void, onDelete?: (userId: number) => void) {
  const handleEdit = useCallback(() => {
    onEdit?.(user);
  }, [user, onEdit]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`确定要删除用户 ${user.name} 吗？`)) {
      onDelete?.(user.id);
    }
  }, [user.id, user.name, onDelete]);

  return { handleEdit, handleDelete };
}

// 状态徽章组件
const StatusBadge: React.FC<{ status: User['status'] }> = ({ status }) => {
  const statusConfig = {
    active: { label: '活跃', className: 'bg-green-100 text-green-800' },
    inactive: { label: '非活跃', className: 'bg-gray-100 text-gray-800' },
    suspended: { label: '已暂停', className: 'bg-red-100 text-red-800' }
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

// 角色徽章组件
const RoleBadge: React.FC<{ role: User['role'] }> = ({ role }) => {
  const roleConfig = {
    admin: { label: '管理员', className: 'bg-purple-100 text-purple-800' },
    moderator: { label: '版主', className: 'bg-blue-100 text-blue-800' },
    user: { label: '用户', className: 'bg-gray-100 text-gray-800' }
  };

  const config = roleConfig[role];

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

// 主组件
export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  onStatusChange,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { handleEdit, handleDelete } = useUserActions(user, onEdit, onDelete);

  // 计算用户注册天数
  const daysSinceRegistration = useMemo(() => {
    const now = new Date();
    const created = new Date(user.createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, [user.createdAt]);

  // 处理状态变更
  const handleStatusChange = useCallback(async (newStatus: User['status']) => {
    setIsLoading(true);
    try {
      await onStatusChange?.(user.id, newStatus);
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, onStatusChange]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExpanded]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const cardClasses = `
    bg-white rounded-lg shadow-md border border-gray-200 p-4 
    transition-all duration-200 hover:shadow-lg hover:border-gray-300
    ${compact ? 'p-3' : 'p-4'}
    ${className}
  `.trim();

  return (
    <div ref={cardRef} className={cardClasses}>
      {/* 用户头像和基本信息 */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className={`rounded-full object-cover ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}
            />
          ) : (
            <div className={`bg-gray-300 rounded-full flex items-center justify-center ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <span className="text-gray-600 font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>
              {user.name}
            </h3>
            <div className="flex space-x-1">
              <StatusBadge status={user.status} />
              <RoleBadge role={user.role} />
            </div>
          </div>

          <p className={`text-gray-500 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {user.email}
          </p>

          {!compact && (
            <div className="mt-2 flex items-center text-xs text-gray-400">
              <span>注册于 {formatDate(user.createdAt)}</span>
              <span className="mx-2">•</span>
              <span>{daysSinceRegistration} 天前</span>
              {user.lastLoginAt && (
                <>
                  <span className="mx-2">•</span>
                  <span>最后登录: {formatDate(user.lastLoginAt)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isExpanded && !compact && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">用户ID:</span>
              <span className="ml-2 text-gray-600">{user.id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">状态:</span>
              <select
                value={user.status}
                onChange={(e) => handleStatusChange(e.target.value as User['status'])}
                disabled={isLoading}
                className="ml-2 text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
                <option value="suspended">已暂停</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {showActions && (
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '收起' : '展开'}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              编辑
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 加载状态覆盖层 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-sm text-gray-600">更新中...</div>
        </div>
      )}
    </div>
  );
};

// 用户列表组件
export interface UserListProps {
  users: User[];
  onUserEdit?: (user: User) => void;
  onUserDelete?: (userId: number) => void;
  onUserStatusChange?: (userId: number, status: User['status']) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  onUserEdit,
  onUserDelete,
  onUserStatusChange,
  loading = false,
  emptyMessage = '暂无用户数据'
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={onUserEdit}
          onDelete={onUserDelete}
          onStatusChange={onUserStatusChange}
        />
      ))}
    </div>
  );
};

// 默认导出
export default UserCard; 