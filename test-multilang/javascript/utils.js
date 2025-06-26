// JavaScript 工具函数集合

// 防抖函数
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 深拷贝函数
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Set) {
    return new Set([...obj].map(item => deepClone(item)));
  }
  
  if (obj instanceof Map) {
    return new Map([...obj].map(([key, value]) => [deepClone(key), deepClone(value)]));
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
}

// 数组工具函数
export const arrayUtils = {
  // 数组去重
  unique: (arr) => [...new Set(arr)],
  
  // 数组扁平化
  flatten: (arr) => arr.flat(Infinity),
  
  // 数组分块
  chunk: (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },
  
  // 数组随机排序
  shuffle: (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
  
  // 数组交集
  intersection: (arr1, arr2) => arr1.filter(x => arr2.includes(x)),
  
  // 数组差集
  difference: (arr1, arr2) => arr1.filter(x => !arr2.includes(x)),
  
  // 数组并集
  union: (arr1, arr2) => [...new Set([...arr1, ...arr2])],
  
  // 分组
  groupBy: (arr, key) => {
    return arr.reduce((groups, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
};

// 对象工具函数
export const objectUtils = {
  // 深度合并对象
  deepMerge: (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          objectUtils.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return objectUtils.deepMerge(target, ...sources);
  },
  
  // 获取嵌套属性值
  get: (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  },
  
  // 设置嵌套属性值
  set: (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
  },
  
  // 删除嵌套属性
  unset: (obj, path) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        return false;
      }
      current = current[key];
    }
    
    delete current[lastKey];
    return true;
  },
  
  // 对象键值对调换
  invert: (obj) => {
    const inverted = {};
    for (const key in obj) {
      inverted[obj[key]] = key;
    }
    return inverted;
  },
  
  // 选择对象属性
  pick: (obj, keys) => {
    const picked = {};
    keys.forEach(key => {
      if (key in obj) {
        picked[key] = obj[key];
      }
    });
    return picked;
  },
  
  // 排除对象属性
  omit: (obj, keys) => {
    const omitted = { ...obj };
    keys.forEach(key => {
      delete omitted[key];
    });
    return omitted;
  }
};

// 字符串工具函数
export const stringUtils = {
  // 驼峰转换
  camelCase: (str) => {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
  },
  
  // 蛇形转换
  snakeCase: (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  },
  
  // 短横线转换
  kebabCase: (str) => {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
  },
  
  // 首字母大写
  capitalize: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  // 标题格式
  titleCase: (str) => {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },
  
  // 截断字符串
  truncate: (str, length, suffix = '...') => {
    return str.length > length ? str.substring(0, length) + suffix : str;
  },
  
  // 移除HTML标签
  stripHtml: (str) => {
    return str.replace(/<[^>]*>/g, '');
  },
  
  // 转义HTML
  escapeHtml: (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  // 反转义HTML
  unescapeHtml: (str) => {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  }
};

// 日期工具函数
export const dateUtils = {
  // 格式化日期
  format: (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },
  
  // 相对时间
  timeAgo: (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);
    
    if (years > 0) return `${years}年前`;
    if (months > 0) return `${months}个月前`;
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  },
  
  // 添加天数
  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  // 获取月份天数
  getDaysInMonth: (year, month) => {
    return new Date(year, month, 0).getDate();
  },
  
  // 判断是否为闰年
  isLeapYear: (year) => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
};

// 数学工具函数
export const mathUtils = {
  // 随机数生成
  random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  
  // 数字格式化
  formatNumber: (num, decimals = 2) => {
    return Number(num).toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },
  
  // 百分比计算
  percentage: (value, total) => {
    return total === 0 ? 0 : (value / total) * 100;
  },
  
  // 范围限制
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  
  // 线性插值
  lerp: (start, end, factor) => start + (end - start) * factor,
  
  // 四舍五入到指定小数位
  round: (num, decimals = 0) => {
    const multiplier = Math.pow(10, decimals);
    return Math.round(num * multiplier) / multiplier;
  }
};

// 验证工具函数
export const validators = {
  // 邮箱验证
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  
  // 手机号验证（中国）
  phone: (phone) => {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(phone);
  },
  
  // 身份证验证（中国）
  idCard: (idCard) => {
    const regex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return regex.test(idCard);
  },
  
  // URL验证
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  // 强密码验证
  strongPassword: (password) => {
    // 至少8位，包含大小写字母、数字和特殊字符
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }
};

// 存储工具函数
export const storageUtils = {
  // localStorage 封装
  local: {
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    
    get: (key, defaultValue = null) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    
    remove: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    
    clear: () => {
      try {
        localStorage.clear();
        return true;
      } catch {
        return false;
      }
    }
  },
  
  // sessionStorage 封装
  session: {
    set: (key, value) => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    
    get: (key, defaultValue = null) => {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    
    remove: (key) => {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    
    clear: () => {
      try {
        sessionStorage.clear();
        return true;
      } catch {
        return false;
      }
    }
  }
};

// 异步工具函数
export const asyncUtils = {
  // 延迟函数
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 超时包装
  timeout: (promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), ms)
      )
    ]);
  },
  
  // 重试函数
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await asyncUtils.delay(delay * attempt);
        }
      }
    }
    
    throw lastError;
  },
  
  // 并发限制
  concurrent: async (tasks, limit = 3) => {
    const results = [];
    const executing = [];
    
    for (const task of tasks) {
      const promise = Promise.resolve().then(() => task());
      results.push(promise);
      
      if (tasks.length >= limit) {
        executing.push(promise.then(() => executing.splice(executing.indexOf(promise), 1)));
        
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }
    
    return Promise.all(results);
  }
};

// 辅助函数
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// 默认导出
export default {
  debounce,
  throttle,
  deepClone,
  arrayUtils,
  objectUtils,
  stringUtils,
  dateUtils,
  mathUtils,
  validators,
  storageUtils,
  asyncUtils
}; 