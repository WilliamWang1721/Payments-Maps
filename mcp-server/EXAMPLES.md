# MCP 工具使用示例

本文档提供了使用 Payments Maps MCP Server 的具体示例。

## 🔐 认证示例

### Google OAuth 认证
```json
{
  "tool": "authenticate",
  "parameters": {
    "provider": "google",
    "access_token": "ya29.a0AfH6SMC..."
  }
}
```

**响应示例**:
```json
{
  "status": "authenticated",
  "user": {
    "id": "google_123456789",
    "email": "user@example.com",
    "name": "张三",
    "avatar": "https://lh3.googleusercontent.com/...",
    "provider": "google"
  },
  "message": "认证成功"
}
```

## 🔍 搜索示例

### 1. 基础关键词搜索
```json
{
  "tool": "search_pos_machines",
  "parameters": {
    "query": "星巴克"
  }
}
```

### 2. 地理位置搜索
```json
{
  "tool": "search_pos_machines",
  "parameters": {
    "latitude": 39.9042,
    "longitude": 116.4074,
    "radius": 2,
    "query": "咖啡"
  }
}
```

### 3. 高级筛选搜索
```json
{
  "tool": "search_pos_machines",
  "parameters": {
    "query": "便利店",
    "filters": {
      "supportsApplePay": true,
      "supportsContactless": true,
      "supportsVisa": true,
      "status": "active"
    },
    "limit": 10
  }
}
```

**搜索响应示例**:
```json
{
  "total": 3,
  "results": [
    {
      "id": "pos_1640995200_abc123456",
      "merchant_name": "星巴克（三里屯店）",
      "address": "北京市朝阳区三里屯太古里",
      "distance": "1.2 km",
      "status": "active",
      "supports": {
        "apple_pay": true,
        "google_pay": true,
        "contactless": true,
        "card_networks": ["Visa", "Mastercard", "UnionPay"]
      },
      "created_at": "2023-12-01T10:00:00Z"
    }
  ]
}
```

## 📍 POS 机管理示例

### 1. 添加新 POS 机
```json
{
  "tool": "add_pos_machine",
  "parameters": {
    "address": "上海市黄浦区南京东路步行街",
    "latitude": 31.2304,
    "longitude": 121.4737,
    "merchant_name": "麦当劳（南京路店）",
    "basic_info": {
      "model": "Verifone VX520",
      "acquiring_institution": "工商银行",
      "checkout_location": "人工收银",
      "supports_foreign_cards": true,
      "supports_apple_pay": true,
      "supports_google_pay": true,
      "supports_contactless": true,
      "supports_hce_simulation": false,
      "supports_dcc": true,
      "supports_edc": false,
      "min_amount_no_pin": 300,
      "supported_card_networks": [
        "Visa",
        "Mastercard", 
        "UnionPay",
        "American Express"
      ]
    },
    "remarks": "24小时营业，支持多种国际卡，DCC汇率较好"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "pos_machine": {
    "id": "pos_1640995200_xyz987654",
    "merchant_name": "麦当劳（南京路店）",
    "address": "上海市黄浦区南京东路步行街",
    "status": "active",
    "created_at": "2023-12-01T15:30:00Z"
  },
  "message": "POS 机添加成功"
}
```

### 2. 获取 POS 机详情
```json
{
  "tool": "get_pos_machine_details",
  "parameters": {
    "pos_id": "pos_1640995200_xyz987654"
  }
}
```

### 3. 更新 POS 机信息
```json
{
  "tool": "update_pos_machine",
  "parameters": {
    "pos_id": "pos_1640995200_xyz987654",
    "updates": {
      "merchant_name": "麦当劳（南京路旗舰店）",
      "basic_info": {
        "supports_google_pay": false,
        "min_amount_no_pin": 200
      },
      "remarks": "已更新支付限额，Google Pay 暂时停用"
    }
  }
}
```

### 4. 获取我的 POS 机列表
```json
{
  "tool": "get_my_pos_machines",
  "parameters": {
    "status": "active",
    "limit": 50
  }
}
```

**响应示例**:
```json
{
  "total": 12,
  "filter": { "status": "active" },
  "pos_machines": [
    {
      "id": "pos_1640995200_xyz987654",
      "merchant_name": "麦当劳（南京路旗舰店）",
      "address": "上海市黄浦区南京东路步行街",
      "status": "active",
      "supports": {
        "apple_pay": true,
        "google_pay": false,
        "contactless": true,
        "card_networks": ["Visa", "Mastercard", "UnionPay", "American Express"]
      },
      "created_at": "2023-12-01T15:30:00Z",
      "updated_at": "2023-12-02T10:15:00Z"
    }
  ]
}
```

### 5. 删除 POS 机
```json
{
  "tool": "delete_pos_machine",
  "parameters": {
    "pos_id": "pos_1640995200_xyz987654"
  }
}
```

## 🎯 实际使用场景

### 场景 1: 寻找附近支持 Apple Pay 的咖啡店
```json
{
  "tool": "search_pos_machines",
  "parameters": {
    "query": "咖啡",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "radius": 1,
    "filters": {
      "supportsApplePay": true,
      "status": "active"
    }
  }
}
```

### 场景 2: 商户管理自己的 POS 设备
```json
// 1. 先认证
{
  "tool": "authenticate", 
  "parameters": {
    "provider": "google",
    "access_token": "..."
  }
}

// 2. 查看所有设备
{
  "tool": "get_my_pos_machines",
  "parameters": {
    "status": "all"
  }
}

// 3. 更新维护状态
{
  "tool": "update_pos_machine",
  "parameters": {
    "pos_id": "pos_xxx",
    "updates": {
      "status": "maintenance",
      "remarks": "设备升级中，预计2小时后恢复"
    }
  }
}
```

### 场景 3: 国际游客查找支持外卡的商户
```json
{
  "tool": "search_pos_machines",
  "parameters": {
    "latitude": 31.2304,
    "longitude": 121.4737,
    "radius": 5,
    "filters": {
      "supportsVisa": true,
      "supportsMastercard": true,
      "supportsDCC": true
    }
  }
}
```

## ⚠️ 错误处理示例

### 未认证错误
```json
{
  "content": [
    {
      "type": "text",
      "text": "错误: 请先使用 authenticate 工具进行认证"
    }
  ],
  "isError": true
}
```

### 权限不足错误  
```json
{
  "content": [
    {
      "type": "text", 
      "text": "更新 POS 机失败: 无权限修改此 POS 机"
    }
  ],
  "isError": true
}
```

### 参数缺失错误
```json
{
  "content": [
    {
      "type": "text",
      "text": "错误: 缺少必要的字段（address, latitude, longitude, merchant_name）"
    }
  ],
  "isError": true
}
```

## 💡 最佳实践

1. **认证管理**: 定期刷新 OAuth 令牌，处理认证过期
2. **数据验证**: 添加 POS 机前验证坐标和地址准确性
3. **批量操作**: 使用适当的限制参数避免一次性返回过多数据
4. **错误处理**: 始终检查响应中的错误状态并适当处理
5. **权限意识**: 只修改自己添加的 POS 机数据

通过这些示例，您可以快速上手使用 Payments Maps MCP Server 管理 POS 机数据！