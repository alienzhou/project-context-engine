<template>
  <div class="user-list">
    <div class="list-header">
      <h2>用户列表</h2>
      <div class="list-controls">
        <input 
          v-model="searchQuery" 
          placeholder="搜索用户..." 
          class="search-input"
          @input="handleSearch"
        />
        <button @click="addUser" class="btn btn-primary">添加用户</button>
      </div>
    </div>
    
    <div class="list-filters">
      <select v-model="selectedRole" @change="filterByRole" class="role-filter">
        <option value="">所有角色</option>
        <option value="admin">管理员</option>
        <option value="moderator">版主</option>
        <option value="user">普通用户</option>
      </select>
      
      <label class="checkbox-label">
        <input type="checkbox" v-model="showActiveOnly" @change="filterByStatus" />
        只显示活跃用户
      </label>
    </div>
    
    <div class="user-grid" v-if="filteredUsers.length > 0">
      <div 
        v-for="user in paginatedUsers" 
        :key="user.id"
        class="user-item"
        :class="{ 'user-inactive': !user.isActive }"
        @click="selectUser(user)"
      >
        <div class="user-avatar">
          <img :src="getUserAvatar(user)" :alt="user.name" />
        </div>
        <div class="user-details">
          <h4>{{ user.name }}</h4>
          <p>{{ user.email }}</p>
          <span class="user-role" :class="`role-${user.role}`">{{ getRoleText(user.role) }}</span>
        </div>
        <div class="user-actions">
          <button @click.stop="editUser(user)" class="btn-icon">✏️</button>
          <button @click.stop="deleteUser(user)" class="btn-icon">🗑️</button>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>没有找到用户</p>
    </div>
    
    <div class="pagination" v-if="totalPages > 1">
      <button 
        @click="prevPage" 
        :disabled="currentPage === 1"
        class="btn btn-secondary"
      >
        上一页
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        @click="nextPage" 
        :disabled="currentPage === totalPages"
        class="btn btn-secondary"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserList',
  
  props: {
    users: {
      type: Array,
      default: () => []
    },
    pageSize: {
      type: Number,
      default: 10
    }
  },
  
  data() {
    return {
      searchQuery: '',
      selectedRole: '',
      showActiveOnly: false,
      currentPage: 1,
      selectedUser: null,
      loading: false
    };
  },
  
  computed: {
    filteredUsers() {
      let filtered = [...this.users];
      
      // 按搜索关键词过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(user => 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      }
      
      // 按角色过滤
      if (this.selectedRole) {
        filtered = filtered.filter(user => user.role === this.selectedRole);
      }
      
      // 按状态过滤
      if (this.showActiveOnly) {
        filtered = filtered.filter(user => user.isActive);
      }
      
      return filtered;
    },
    
    totalPages() {
      return Math.ceil(this.filteredUsers.length / this.pageSize);
    },
    
    paginatedUsers() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredUsers.slice(start, end);
    },
    
    userStats() {
      const total = this.users.length;
      const active = this.users.filter(u => u.isActive).length;
      const admins = this.users.filter(u => u.role === 'admin').length;
      
      return { total, active, admins };
    }
  },
  
  watch: {
    searchQuery() {
      this.currentPage = 1; // 搜索时重置到第一页
    },
    
    selectedRole() {
      this.currentPage = 1;
    },
    
    showActiveOnly() {
      this.currentPage = 1;
    },
    
    users: {
      handler(newUsers) {
        console.log('用户列表更新:', newUsers.length);
        this.validateCurrentPage();
      },
      deep: true
    }
  },
  
  methods: {
    handleSearch() {
      // 防抖处理
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.$emit('search', this.searchQuery);
      }, 300);
    },
    
    filterByRole() {
      this.$emit('filter-role', this.selectedRole);
    },
    
    filterByStatus() {
      this.$emit('filter-status', this.showActiveOnly);
    },
    
    selectUser(user) {
      this.selectedUser = user;
      this.$emit('user-selected', user);
    },
    
    addUser() {
      this.$emit('add-user');
    },
    
    editUser(user) {
      this.$emit('edit-user', user);
    },
    
    async deleteUser(user) {
      if (!confirm(`确定要删除用户 ${user.name} 吗？`)) {
        return;
      }
      
      this.loading = true;
      try {
        await this.$emit('delete-user', user.id);
        this.$message.success('用户删除成功');
      } catch (error) {
        this.$message.error('删除失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    getUserAvatar(user) {
      return user.avatar || '/default-avatar.png';
    },
    
    getRoleText(role) {
      const roleMap = {
        admin: '管理员',
        moderator: '版主',
        user: '普通用户'
      };
      return roleMap[role] || '未知';
    },
    
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },
    
    validateCurrentPage() {
      if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.currentPage = this.totalPages;
      }
    },
    
    resetFilters() {
      this.searchQuery = '';
      this.selectedRole = '';
      this.showActiveOnly = false;
      this.currentPage = 1;
    },
    
    exportUsers() {
      const exportData = this.filteredUsers.map(user => ({
        name: user.name,
        email: user.email,
        role: this.getRoleText(user.role),
        status: user.isActive ? '活跃' : '非活跃'
      }));
      
      this.$emit('export-users', exportData);
    }
  },
  
  mounted() {
    console.log('UserList 组件已挂载，用户数量:', this.users.length);
    this.validateCurrentPage();
  },
  
  beforeDestroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
};
</script>

<style scoped>
.user-list {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h2 {
  margin: 0;
  color: #2c3e50;
}

.list-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
}

.list-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  align-items: center;
}

.role-filter {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.user-item.user-inactive {
  opacity: 0.6;
}

.user-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
}

.user-details {
  flex: 1;
}

.user-details h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #2c3e50;
}

.user-details p {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #6c757d;
}

.user-role {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.role-admin {
  background: #ff6b6b;
  color: white;
}

.role-moderator {
  background: #4ecdc4;
  color: white;
}

.role-user {
  background: #95e1d3;
  color: #2c3e50;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.btn-icon:hover {
  background-color: #f8f9fa;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.page-info {
  font-size: 14px;
  color: #6c757d;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}
</style> 