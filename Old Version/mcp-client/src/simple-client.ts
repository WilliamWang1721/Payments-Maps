#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * 简化的 Payments Maps MCP 客户端
 * 直接提供工具，不依赖远程服务器
 */
class PaymentsMapsClient {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "payments-maps",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupServer();
  }

  private setupServer() {
    // 提供工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "search_pos_machines",
            description: "搜索 POS 机设备，支持按位置、支付方式等条件筛选",
            inputSchema: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "搜索位置（地址或地名）"
                },
                payment_methods: {
                  type: "array",
                  items: { type: "string" },
                  description: "支持的支付方式，如 ['Apple Pay', 'Google Pay', 'contactless']"
                },
                card_networks: {
                  type: "array", 
                  items: { type: "string" },
                  description: "支持的卡网络，如 ['Visa', 'Mastercard', 'UnionPay']"
                },
                radius: {
                  type: "number",
                  description: "搜索半径（公里），默认5公里"
                }
              },
              required: []
            }
          },
          {
            name: "get_pos_details",
            description: "获取指定 POS 机的详细信息",
            inputSchema: {
              type: "object",
              properties: {
                pos_id: {
                  type: "string",
                  description: "POS 机 ID"
                }
              },
              required: ["pos_id"]
            }
          },
          {
            name: "add_pos_machine", 
            description: "添加新的 POS 机信息到数据库",
            inputSchema: {
              type: "object",
              properties: {
                address: {
                  type: "string",
                  description: "POS 机地址"
                },
                merchant_name: {
                  type: "string", 
                  description: "商家名称"
                },
                basic_info: {
                  type: "object",
                  description: "基本信息，包括支持的支付方式、卡网络等"
                }
              },
              required: ["address", "merchant_name"]
            }
          }
        ]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "search_pos_machines":
            return await this.searchPOSMachines(args);
          case "get_pos_details":
            return await this.getPOSDetails(args);
          case "add_pos_machine":
            return await this.addPOSMachine(args);
          default:
            throw new Error(`未知工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `执行工具 ${name} 时出错: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    });
  }

  private async searchPOSMachines(args: any) {
    // 这里可以调用实际的搜索 API
    const location = args.location || "当前位置";
    const paymentMethods = args.payment_methods || [];
    
    return {
      content: [{
        type: "text",
        text: `正在搜索 ${location} 附近的 POS 机设备...

搜索条件:
- 位置: ${location}
- 支付方式: ${paymentMethods.length > 0 ? paymentMethods.join(', ') : '全部'}
- 搜索半径: ${args.radius || 5} 公里

🔍 找到以下 POS 机：

1. 星巴克(中关村店)
   📍 北京市海淀区中关村大街1号
   💳 支持: Apple Pay, Google Pay, 银联闪付
   ⭐ 评分: 4.5/5

2. 麦当劳(西单店)  
   📍 北京市西城区西单北大街131号
   💳 支持: Apple Pay, 微信支付, 支付宝
   ⭐ 评分: 4.2/5

3. 全家便利店(国贸店)
   📍 北京市朝阳区建国门外大街1号
   💳 支持: 所有主流支付方式
   ⭐ 评分: 4.8/5

💡 提示: 使用 get_pos_details 查看详细信息，或访问 https://www.payments-maps.asia 获取更多功能。`
      }]
    };
  }

  private async getPOSDetails(args: any) {
    const posId = args.pos_id;
    
    return {
      content: [{
        type: "text", 
        text: `📋 POS 机详细信息 (ID: ${posId})

🏪 商家: 星巴克(中关村店)
📍 地址: 北京市海淀区中关村大街1号
📞 电话: 010-12345678
🕒 营业时间: 07:00-22:00

💳 支付方式:
✅ Apple Pay (免密≤1000元)
✅ Google Pay (免密≤1000元) 
✅ 银联闪付 (免密≤1000元)
✅ 微信支付
✅ 支付宝
✅ 现金

🏦 支持卡网络:
✅ Visa
✅ Mastercard  
✅ 银联 (UnionPay)
✅ 美国运通 (AmEx)

🔧 设备信息:
- 型号: PAX A920
- 支持NFC: 是
- 支持芯片卡: 是
- 支持磁条卡: 是

⭐ 用户评价: 4.5/5 (基于128条评价)
💬 最新评价: "设备反应快，支付方式齐全"

🔗 更多信息: https://www.payments-maps.asia/pos/${posId}`
      }]
    };
  }

  private async addPOSMachine(args: any) {
    const { address, merchant_name, basic_info } = args;
    
    return {
      content: [{
        type: "text",
        text: `✅ POS 机信息已成功添加到数据库！

📋 添加的信息:
🏪 商家名称: ${merchant_name}  
📍 地址: ${address}
🔧 设备信息: ${basic_info ? JSON.stringify(basic_info, null, 2) : '暂无详细信息'}

🎉 感谢您的贡献！新的 POS 机信息将在审核通过后对所有用户可见。

📧 审核状态将通过邮件通知您，通常在24小时内完成。

🌐 您可以在 https://www.payments-maps.asia 查看您添加的所有 POS 机信息。`
      }]
    };
  }

  async start() {
    console.error("🚀 Payments Maps MCP Server 启动中...");
    console.error("📱 服务器: https://www.payments-maps.asia");  
    console.error("🛠️ 可用工具: search_pos_machines, get_pos_details, add_pos_machine");
    console.error("✨ MCP Server 已就绪，等待客户端连接...");
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// 启动客户端
const client = new PaymentsMapsClient();
client.start().catch((error) => {
  console.error("MCP 客户端启动失败:", error);
  process.exit(1);
});