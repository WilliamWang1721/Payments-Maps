# Beta用户权限自助激活功能设计文档

## 1. 功能概述

为Payments Maps项目增加Beta用户权限自助激活功能，允许普通用户通过输入管理员生成的激活码来获得Beta用户权限。

## 2. 核心功能

### 2.1 用户角色

| 角色 | 权限 | 功能 |
|------|------|------|
| 普通用户 | 基础功能 | 可以激活Beta权益 |
| Beta用户 | 增强功能 | 可以添加/编辑POS机、发表评价 |
| 管理员/超级管理员 | 管理权限 | 可以生成激活码、管理用户角色 |

### 2.2 功能模块

#### 激活码管理系统
1. **激活码表设计**：存储激活码信息
2. **激活码生成**：管理员可以生成新的激活码
3. **激活码验证**：验证激活码有效性
4. **权限升级**：自动将用户角色从regular升级为beta

#### 用户界面
1. **激活入口**：在"我的"页面添加"激活Beta权益"按钮
2. **激活弹窗**：输入激活码的界面
3. **管理界面**：管理员生成和管理激活码的界面

## 3. 数据库设计

### 3.1 激活码表 (activation_codes)

```sql
CREATE TABLE activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0
);
```

### 3.2 激活记录表 (activation_logs)

```sql
CREATE TABLE activation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  activation_code_id UUID NOT NULL REFERENCES activation_codes(id),
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. API设计

### 4.1 激活码验证和使用

```typescript
// 验证并使用激活码
POST /api/activation/activate
{
  "code": "BETA2024ABC"
}

// 响应
{
  "success": true,
  "message": "Beta权限激活成功",
  "newRole": "beta"
}
```

### 4.2 激活码管理（管理员功能）

```typescript
// 生成新激活码
POST /api/activation/generate
{
  "name": "2024年春季Beta邀请",
  "description": "春季活动Beta用户邀请码"
}

// 获取激活码列表
GET /api/activation/codes

// 停用激活码
PUT /api/activation/codes/{id}/deactivate
```

## 5. 用户界面设计

### 5.1 激活入口
- 位置：Profile页面的"快捷操作"区域
- 显示条件：仅对role为'regular'的用户显示
- 样式：与其他快捷操作按钮保持一致

### 5.2 激活弹窗
- 标题："激活Beta权益"
- 输入框：激活码输入（大写字母+数字）
- 按钮："激活"和"取消"
- 说明文字："请输入管理员提供的激活码"

### 5.3 管理界面
- 位置：角色管理页面新增"激活码管理"标签
- 功能：生成、查看、停用激活码
- 统计：显示每个激活码的使用次数

## 6. 实现步骤

1. **数据库迁移**：创建激活码相关表
2. **后端API**：实现激活码验证和管理功能
3. **前端界面**：修改Profile页面，添加激活功能
4. **管理界面**：扩展角色管理页面，添加激活码管理
5. **权限验证**：确保激活后权限正确更新
6. **测试验证**：全流程功能测试

## 7. 安全考虑

1. **激活码格式**：使用随机生成的大写字母+数字组合
2. **重复激活**：同一用户不能重复激活
3. **权限验证**：只有管理员可以生成激活码
4. **日志记录**：记录所有激活操作用于审计
5. **输入验证**：前后端都要验证激活码格式

## 8. 用户体验

1. **即时反馈**：激活成功后立即显示新权限
2. **错误提示**：清晰的错误信息（无效码、已激活等）
3. **状态更新**：激活后自动刷新用户角色显示
4. **引导说明**：提供激活码获取方式的说明
