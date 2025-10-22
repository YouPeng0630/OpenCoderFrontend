# 🏗️ 项目架构说明

## 📊 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   Browser (用户界面)                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              React Router (路由管理)                  │
│  /login  /role-selection  /project-manager  /coder  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│            ProtectedRoute (路由保护)                  │
│        认证检查 → 角色检查 → 权限验证                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│             AuthContext (认证上下文)                  │
│      管理用户状态、登录、登出、角色更新              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              LocalStorage (状态持久化)                │
│           auth_state + user_info                    │
└─────────────────────────────────────────────────────┘
```

## 🔄 数据流向

### 登录流程

```
1. 用户在 Login 页面输入凭据
        ↓
2. 调用 AuthContext.login()
        ↓
3. api.login() 发送请求（当前为模拟）
        ↓
4. 获取 Token 和 User 信息
        ↓
5. storage.saveAuthState() 保存 Token
   storage.saveUser() 保存用户信息
        ↓
6. 更新 AuthContext 状态
        ↓
7. 检查用户角色
   ├─ 无角色 → 跳转到 /role-selection
   └─ 有角色 → 跳转到对应页面
```

### 角色选择流程

```
1. 用户在 RoleSelection 页面选择角色
        ↓
2. 调用 AuthContext.updateUserRole()
        ↓
3. api.updateUserRole() 发送请求
        ↓
4. storage.saveUser() 更新用户信息
        ↓
5. 更新 AuthContext 状态
        ↓
6. 根据角色跳转
   ├─ project-manager → /project-manager
   └─ coder → /coder
```

### 页面访问流程

```
1. 用户访问受保护页面
        ↓
2. ProtectedRoute 拦截
        ↓
3. 第一层：检查是否登录
   ├─ 未登录 → /login
   └─ 已登录 → 继续
        ↓
4. 第二层：检查是否有角色
   ├─ 无角色 → /role-selection
   └─ 有角色 → 继续
        ↓
5. 第三层：检查角色权限
   ├─ 权限不匹配 → 跳转到正确页面
   └─ 权限匹配 → 允许访问
```

## 📁 目录结构详解

### `/src/components/` - 组件目录

#### `auth/`
- **ProtectedRoute.tsx**: 路由保护组件
  - 三层保护机制
  - 自动重定向
  - 加载状态显示

#### `layout/`
- **Header.tsx**: 顶部导航栏
  - 用户信息显示
  - 下拉菜单
  - 登出功能
- **PageLayout.tsx**: 页面布局容器
  - 统一的页面结构
  - 包含 Header

### `/src/contexts/` - 上下文目录

- **AuthContext.tsx**: 认证上下文
  - 管理全局认证状态
  - 提供 `useAuth` Hook
  - 功能：login, logout, updateUserRole
  - 状态：user, isAuthenticated, isLoading

### `/src/lib/` - 工具库目录

#### `storage.ts` - LocalStorage 封装
```typescript
// 认证状态管理
saveAuthState()
getAuthState()
clearAuthState()

// 用户信息管理
saveUser()
getUser()
clearUser()

// 工具函数
isTokenExpired()
getToken()
clearAllStorage()
```

#### `api.ts` - API 请求封装
```typescript
// 认证相关
login(credentials)          // 登录
logout()                    // 登出

// 用户相关
getCurrentUser()            // 获取当前用户
updateUserRole(role)        // 更新角色

// 工具函数
getAuthHeaders()            // 获取请求头
handleResponse()            // 处理响应
```

### `/src/pages/` - 页面目录

#### `Login.tsx` - 登录页面
- 表单验证
- 错误处理
- 自动重定向
- 演示模式提示

#### `RoleSelection.tsx` - 角色选择页面
- 角色卡片展示
- 单选逻辑
- 角色说明
- 确认按钮

#### `ProjectManager.tsx` - 项目经理页面
- Radix UI Tabs 组件
- 4 个 Tab 页面：
  1. **概览**: 统计数据 + 最近活动
  2. **任务**: 任务列表表格
  3. **团队**: 团队成员卡片
  4. **分析**: 进度统计图表

#### `Coder.tsx` - 开发者页面
- Monaco Editor 集成
- 多语言支持
- 工具栏功能
- 主题切换
- 快捷键支持

### `/src/types/` - 类型定义目录

#### `auth.ts` - 认证相关类型
```typescript
LoginCredentials      // 登录凭据
AuthState            // 认证状态
AuthContextType      // Context 类型
User                 // 用户信息
UserRole             // 用户角色
```

#### `user.ts` - 用户相关类型
```typescript
User                 // 基础用户信息
UserRole             // 角色类型
UserProfile          // 扩展用户信息
```

## 🔐 安全机制

### Token 管理

```typescript
// Token 结构
{
  token: string,           // JWT Token
  isAuthenticated: boolean, // 认证状态
  expiresAt: number        // 过期时间戳
}

// 过期检查
if (Date.now() > expiresAt) {
  // 自动清除并跳转登录
  clearAuthState();
  navigate('/login');
}
```

### 路由保护层级

```
Level 1: Authentication Guard
  检查 token 是否存在且有效
  ↓
Level 2: Role Assignment Guard
  检查用户是否已选择角色
  ↓
Level 3: Permission Guard
  检查用户角色是否匹配当前路由
```

## 🎨 UI 组件架构

### Radix UI 组件使用

```
登录页面:
  - Label (表单标签)

角色选择:
  - RadioGroup (单选组)

项目经理页面:
  - Tabs (标签页)
  - Separator (分隔线)

导航栏:
  - Avatar (头像)
  - DropdownMenu (下拉菜单)
```

### Tailwind CSS 设计系统

```css
/* 颜色系统 */
--primary        // 主色调 (蓝色)
--secondary      // 次要色 (灰色)
--accent         // 强调色
--destructive    // 危险色 (红色)
--muted          // 柔和色

/* 语义化类名 */
.bg-background   // 背景色
.text-foreground // 前景色（文字）
.border-border   // 边框色
```

## 📊 状态管理策略

### Context API 使用

```
AuthContext (全局)
├─ user: User | null
├─ isAuthenticated: boolean
├─ isLoading: boolean
└─ methods:
    ├─ login()
    ├─ logout()
    └─ updateUserRole()

使用方式:
const { user, isAuthenticated, login } = useAuth();
```

### LocalStorage 持久化

```javascript
// 存储键名
STORAGE_KEYS = {
  AUTH: 'auth_state',
  USER: 'user_info',
}

// 页面刷新时恢复
useEffect(() => {
  const authState = getAuthState();
  const user = getUser();
  if (authState && user) {
    setUser(user);
  }
}, []);
```

## 🔌 API 集成点

### 需要替换的模拟 API

```typescript
// src/lib/api.ts

// 1. 登录 API
login()          // 当前返回模拟 Token
                 // 替换为: POST /api/auth/login

// 2. 用户信息 API
getCurrentUser() // 当前未实现
                 // 替换为: GET /api/user/me

// 3. 角色更新 API
updateUserRole() // 当前返回模拟数据
                 // 替换为: PATCH /api/user/role

// 4. 登出 API
logout()         // 当前无操作
                 // 替换为: POST /api/auth/logout
```

### 请求拦截器配置

```typescript
// 自动添加 Authorization 头
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
```

## 🚀 扩展点

### 1. 添加新页面

```typescript
// 1. 创建页面组件
src/pages/NewPage.tsx

// 2. 添加路由
<Route path="/new-page" element={
  <ProtectedRoute requireRole="project-manager">
    <NewPage />
  </ProtectedRoute>
} />

// 3. 添加导航链接
<Link to="/new-page">新页面</Link>
```

### 2. 添加新角色

```typescript
// 1. 更新类型定义
// src/types/auth.ts
export type UserRole = 'project-manager' | 'coder' | 'new-role';

// 2. 更新角色选择页面
// src/pages/RoleSelection.tsx
const roles = [
  // ... 现有角色
  {
    value: 'new-role' as UserRole,
    title: '新角色',
    // ...
  }
];

// 3. 添加对应路由
<Route path="/new-role" element={
  <ProtectedRoute requireRole="new-role">
    <NewRolePage />
  </ProtectedRoute>
} />
```

### 3. 添加权限系统

```typescript
// 扩展用户类型
interface User {
  // ... 现有字段
  permissions: string[];  // 添加权限列表
}

// 创建权限检查 Hook
const usePermission = (permission: string) => {
  const { user } = useAuth();
  return user?.permissions.includes(permission);
};

// 使用
const canEdit = usePermission('task:edit');
```

## 🔍 调试技巧

### 查看认证状态

```javascript
// 浏览器控制台
localStorage.getItem('auth_state')
localStorage.getItem('user_info')
```

### React DevTools

```
Components 标签:
  查找 AuthProvider
    → 查看 value 属性
      → user, isAuthenticated, isLoading
```

### Network 监控

```
待后端 API 接入后：
  Network 标签
    → 筛选 XHR/Fetch
      → 查看请求/响应
        → 检查 Authorization 头
```

## 📚 技术决策记录

### 为什么选择 LocalStorage 而非 Cookie?

**优点**:
- ✅ 实现简单，无需后端配合
- ✅ 前端完全控制
- ✅ 容量更大 (5-10MB)

**缺点**:
- ⚠️ 容易受 XSS 攻击
- ⚠️ 需要手动管理过期

**适用场景**: 快速原型、内部系统、学习项目

### 为什么使用 Context API 而非 Redux?

**优点**:
- ✅ 无需额外依赖
- ✅ 代码更简洁
- ✅ 学习曲线低

**缺点**:
- ⚠️ 大型应用性能问题
- ⚠️ 调试工具较少

**适用场景**: 中小型应用，状态不复杂

### 为什么选择 Radix UI?

**优点**:
- ✅ 无样式组件，完全可定制
- ✅ 完整的可访问性支持
- ✅ 与 Tailwind CSS 完美配合

**缺点**:
- ⚠️ 需要自己写样式
- ⚠️ 学习成本中等

**适用场景**: 需要定制化 UI 的项目

## 🎯 性能优化建议

### 1. 代码分割

```typescript
// 使用 React.lazy
const ProjectManager = lazy(() => import('./pages/ProjectManager'));
const Coder = lazy(() => import('./pages/Coder'));
```

### 2. Monaco Editor 优化

```typescript
// 按需加载语言支持
import Editor, { loader } from '@monaco-editor/react';

loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.40.0/min/vs'
  }
});
```

### 3. 图片优化

```typescript
// 使用 WebP 格式
// 添加懒加载
<img loading="lazy" src="..." alt="..." />
```

## 📝 开发规范

### 命名约定

```typescript
// 组件: PascalCase
LoginForm.tsx
ProtectedRoute.tsx

// 函数: camelCase
const handleSubmit = () => {}
const getUserInfo = () => {}

// 常量: UPPER_SNAKE_CASE
const API_BASE_URL = '...'
const STORAGE_KEYS = { ... }

// 类型: PascalCase
interface UserProfile {}
type UserRole = ...
```

### 文件组织

```
特性优先组织:
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api.ts
│   └── tasks/
│       ├── components/
│       ├── hooks/
│       └── api.ts
```

---

## 🎉 总结

这个项目采用了现代化的 React 技术栈，实现了：

✅ 完整的认证流程  
✅ 角色权限系统  
✅ 路由保护机制  
✅ 状态持久化  
✅ 响应式 UI  
✅ 代码编辑器集成  
✅ 项目管理功能  

架构清晰，易于扩展和维护！🚀


