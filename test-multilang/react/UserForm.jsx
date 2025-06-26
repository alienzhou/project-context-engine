import React, { useState, useEffect, useReducer, useContext, createContext } from 'react';

// 创建上下文
const UserFormContext = createContext();

// 表单状态管理
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.field]: action.value,
        errors: {
          ...state.errors,
          [action.field]: ''
        }
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.field]: action.error
        }
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading
      };
    case 'RESET_FORM':
      return action.initialState;
    default:
      return state;
  }
};

// 初始表单状态
const initialFormState = {
  name: '',
  email: '',
  role: 'user',
  status: 'active',
  bio: '',
  avatar: '',
  errors: {},
  isLoading: false
};

// 表单验证 Hook
const useFormValidation = () => {
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return '姓名不能为空';
        if (value.length < 2) return '姓名至少需要2个字符';
        return '';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) return '邮箱不能为空';
        if (!emailRegex.test(value)) return '请输入有效的邮箱地址';
        return '';
      case 'bio':
        if (value.length > 500) return '简介不能超过500个字符';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (formData) => {
    const errors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'errors' && key !== 'isLoading') {
        const error = validateField(key, formData[key]);
        if (error) errors[key] = error;
      }
    });
    return errors;
  };

  return { validateField, validateForm };
};

// 输入字段组件
const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  required = false, 
  placeholder = '', 
  options = null,
  rows = null 
}) => {
  const { formState, dispatch } = useContext(UserFormContext);
  const { validateField } = useFormValidation();

  const handleChange = (e) => {
    const { value } = e.target;
    dispatch({ type: 'SET_FIELD', field: name, value });
    
    // 实时验证
    const error = validateField(name, value);
    if (error) {
      dispatch({ type: 'SET_ERROR', field: name, error });
    }
  };

  const renderInput = () => {
    const commonProps = {
      id: name,
      name,
      value: formState[name] || '',
      onChange: handleChange,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        formState.errors[name] ? 'border-red-500' : 'border-gray-300'
      }`,
      placeholder,
      disabled: formState.isLoading
    };

    if (type === 'select' && options) {
      return (
        <select {...commonProps}>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea 
          {...commonProps} 
          rows={rows || 4}
        />
      );
    }

    return <input {...commonProps} type={type} />;
  };

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {formState.errors[name] && (
        <p className="mt-1 text-sm text-red-600">{formState.errors[name]}</p>
      )}
    </div>
  );
};

// 头像上传组件
const AvatarUpload = () => {
  const { formState, dispatch } = useContext(UserFormContext);
  const [preview, setPreview] = useState(formState.avatar);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型和大小
      if (!file.type.startsWith('image/')) {
        dispatch({ type: 'SET_ERROR', field: 'avatar', error: '请选择图片文件' });
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB
        dispatch({ type: 'SET_ERROR', field: 'avatar', error: '文件大小不能超过2MB' });
        return;
      }

      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setPreview(dataUrl);
        dispatch({ type: 'SET_FIELD', field: 'avatar', value: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setPreview('');
    dispatch({ type: 'SET_FIELD', field: 'avatar', value: '' });
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        头像
      </label>
      
      <div className="flex items-center space-x-4">
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt="Avatar preview" 
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">无头像</span>
          </div>
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={formState.isLoading}
        />
      </div>
      
      {formState.errors.avatar && (
        <p className="mt-1 text-sm text-red-600">{formState.errors.avatar}</p>
      )}
    </div>
  );
};

// 主表单组件
export const UserForm = ({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  submitLabel = '保存',
  isEdit = false 
}) => {
  const [formState, dispatch] = useReducer(formReducer, {
    ...initialFormState,
    ...initialData
  });
  
  const { validateForm } = useFormValidation();

  // 角色选项
  const roleOptions = [
    { value: 'user', label: '普通用户' },
    { value: 'moderator', label: '版主' },
    { value: 'admin', label: '管理员' }
  ];

  // 状态选项
  const statusOptions = [
    { value: 'active', label: '活跃' },
    { value: 'inactive', label: '非活跃' },
    { value: 'suspended', label: '已暂停' }
  ];

  // 表单提交处理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证表单
    const errors = validateForm(formState);
    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach(field => {
        dispatch({ type: 'SET_ERROR', field, error: errors[field] });
      });
      return;
    }

    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      // 准备提交数据
      const submitData = {
        name: formState.name,
        email: formState.email,
        role: formState.role,
        status: formState.status,
        bio: formState.bio,
        avatar: formState.avatar
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
      // 可以在这里处理服务器错误
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  // 重置表单
  const handleReset = () => {
    dispatch({ 
      type: 'RESET_FORM', 
      initialState: { ...initialFormState, ...initialData }
    });
  };

  return (
    <UserFormContext.Provider value={{ formState, dispatch }}>
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {isEdit ? '编辑用户' : '创建用户'}
        </h2>

        <form onSubmit={handleSubmit}>
          <AvatarUpload />
          
          <FormField
            label="姓名"
            name="name"
            required
            placeholder="请输入用户姓名"
          />

          <FormField
            label="邮箱"
            name="email"
            type="email"
            required
            placeholder="请输入邮箱地址"
          />

          <FormField
            label="角色"
            name="role"
            type="select"
            options={roleOptions}
          />

          <FormField
            label="状态"
            name="status"
            type="select"
            options={statusOptions}
          />

          <FormField
            label="个人简介"
            name="bio"
            type="textarea"
            placeholder="请输入个人简介（可选）"
            rows={3}
          />

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={formState.isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState.isLoading ? '保存中...' : submitLabel}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={formState.isLoading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              重置
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={formState.isLoading}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>
    </UserFormContext.Provider>
  );
};

// 表单 Hook（供外部使用）
export const useUserForm = (initialData = {}) => {
  const [formState, dispatch] = useReducer(formReducer, {
    ...initialFormState,
    ...initialData
  });

  const updateField = (field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  const setError = (field, error) => {
    dispatch({ type: 'SET_ERROR', field, error });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', loading });
  };

  const resetForm = () => {
    dispatch({ 
      type: 'RESET_FORM', 
      initialState: { ...initialFormState, ...initialData }
    });
  };

  return {
    formState,
    updateField,
    setError,
    setLoading,
    resetForm
  };
};

// 默认导出
export default UserForm; 