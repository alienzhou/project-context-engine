<template>
  <div class="user-card" :class="{ 'is-active': isActive }">
    <div class="user-avatar">
      <img :src="user.avatar || defaultAvatar" :alt="user.name" @error="handleImageError" />
    </div>
    <div class="user-info">
      <h3 class="user-name">{{ user.name }}</h3>
      <p class="user-email">{{ user.email }}</p>
      <p class="user-role">{{ roleText }}</p>
    </div>
    <div class="user-actions">
      <button @click="editUser" class="btn btn-primary">编辑</button>
      <button @click="deleteUser" class="btn btn-danger" :disabled="isDeleting">
        {{ isDeleting ? '删除中...' : '删除' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref } from 'vue';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  avatar?: string;
  isActive?: boolean;
}

export default defineComponent({
  name: 'UserCard',
  
  props: {
    user: {
      type: Object as PropType<User>,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['edit', 'delete', 'avatar-error'],
  
  setup(props, { emit }) {
    const isDeleting = ref(false);
    const defaultAvatar = '/default-avatar.png';
    
    // 计算属性
    const roleText = computed(() => {
      const roleMap = {
        admin: '管理员',
        moderator: '版主',
        user: '普通用户'
      };
      return roleMap[props.user.role] || '未知角色';
    });
    
    // 方法
    const editUser = () => {
      emit('edit', props.user);
    };
    
    const deleteUser = async () => {
      if (isDeleting.value) return;
      
      isDeleting.value = true;
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
        emit('delete', props.user.id);
      } catch (error) {
        console.error('删除用户失败:', error);
      } finally {
        isDeleting.value = false;
      }
    };
    
    const handleImageError = (event: Event) => {
      const target = event.target as HTMLImageElement;
      target.src = defaultAvatar;
      emit('avatar-error', props.user.id);
    };
    
    // 生命周期钩子
    const onMounted = () => {
      console.log('UserCard mounted for user:', props.user.name);
    };
    
    // 自定义Hook
    const useUserStats = () => {
      const loginCount = ref(0);
      const lastLoginTime = ref<Date | null>(null);
      
      const updateStats = (count: number, time: Date) => {
        loginCount.value = count;
        lastLoginTime.value = time;
      };
      
      return {
        loginCount,
        lastLoginTime,
        updateStats
      };
    };
    
    const { loginCount, lastLoginTime, updateStats } = useUserStats();
    
    return {
      isDeleting,
      defaultAvatar,
      roleText,
      editUser,
      deleteUser,
      handleImageError,
      onMounted,
      loginCount,
      lastLoginTime,
      updateStats
    };
  }
});
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
}

.user-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.user-card.is-active {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.user-avatar {
  margin-right: 16px;
}

.user-avatar img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.user-email {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #6c757d;
}

.user-role {
  margin: 0;
  font-size: 12px;
  color: #28a745;
  font-weight: 500;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}
</style> 