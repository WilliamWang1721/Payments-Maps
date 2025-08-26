import { POSMachine } from '@/lib/supabase'
import { FeesConfiguration } from '@/types/fees'
import { getCardNetworkLabel } from '@/lib/cardNetworks'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// 导出格式类型
export type ExportFormat = 'json' | 'html' | 'pdf'

// 卡片风格类型
export type CardStyle = 'minimal' | 'detailed' | 'business' | 'modern'

// 导出选项接口
export interface ExportOptions {
  format: ExportFormat
  style?: CardStyle
  includeAttempts?: boolean
  includeReviews?: boolean
  includeFees?: boolean
}

// 获取卡片模板函数
const getCardTemplate = (style: CardStyle) => {
  return (data: any) => generateCardHTML(data, style)
}

// 导出为JSON文件
export const exportToJSON = async (data: any, filename: string) => {
  const jsonData = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// 生成卡片HTML内容
export const generateCardHTML = (pos: POSMachine, style: CardStyle = 'detailed'): string => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981'
      case 'inactive': return '#f59e0b'
      case 'maintenance': return '#f97316'
      default: return '#ef4444'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '正常运行'
      case 'inactive': return '暂时不可用'
      case 'maintenance': return '维修中'
      default: return '已停用'
    }
  }

  // 基础样式
  const baseStyles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8fafc;
        padding: 20px;
      }
      .card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 24px;
        text-align: center;
      }
      .title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .subtitle {
        font-size: 16px;
        opacity: 0.9;
      }
      .content {
        padding: 24px;
      }
      .section {
        margin-bottom: 24px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 4px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }
      .info-item {
        background: #f9fafb;
        padding: 12px;
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
      }
      .info-label {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .info-value {
        font-size: 14px;
        color: #111827;
        font-weight: 500;
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: white;
      }
      .tag {
        display: inline-block;
        background: #dbeafe;
        color: #1e40af;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        margin: 2px;
      }
      .footer {
        background: #f9fafb;
        padding: 16px 24px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
      }
      @media print {
        body { background: white; padding: 0; }
        .card { box-shadow: none; }
      }
    </style>
  `

  // 根据风格调整样式
  let styleOverrides = ''
  switch (style) {
    case 'minimal':
      styleOverrides = `
        <style>
          .header { 
            background: #374151; 
            padding: 20px;
          }
          .info-item { 
            background: white; 
            border: 1px solid #e5e7eb;
            border-left: 3px solid #6b7280;
          }
          .section-title { 
            border-bottom: 1px solid #d1d5db;
            color: #374151;
            font-size: 16px;
          }
          .tag {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }
        </style>
      `
      break
    case 'detailed':
      styleOverrides = `
        <style>
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="white" opacity="0.1"/></svg>') repeat;
          }
          .info-item { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-left: 4px solid #3b82f6;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .section-title { 
            border-bottom: 2px solid #3b82f6;
            color: #1e40af;
          }
        </style>
      `
      break
    case 'business':
      styleOverrides = `
        <style>
          .header { 
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border-bottom: 4px solid #d97706;
          }
          .info-item { 
            background: #f8fafc; 
            border-left: 4px solid #d97706;
            border: 1px solid #e5e7eb;
          }
          .section-title {
            color: #1f2937;
            border-bottom: 2px solid #d97706;
            font-weight: 700;
          }
          .tag { 
            background: #fef3c7; 
            color: #92400e;
            border: 1px solid #f59e0b;
            font-weight: 600;
          }
          .status-badge {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        </style>
      `
      break
    case 'modern':
      styleOverrides = `
        <style>
          .card { 
            border-radius: 20px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          .header { 
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
            position: relative;
          }
          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4);
          }
          .info-item { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
            border-left: 4px solid #8b5cf6;
            border-radius: 12px;
            transition: transform 0.2s ease;
          }
          .info-item:hover {
            transform: translateY(-2px);
          }
          .section-title { 
            color: #8b5cf6;
            border-bottom: 2px solid #8b5cf6;
            position: relative;
          }
          .section-title::before {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 30px;
            height: 2px;
            background: #ec4899;
          }
          .tag {
            background: linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%);
            color: #5b21b6;
            border-radius: 8px;
            font-weight: 600;
          }
        </style>
      `
      break
  }

  // 生成支持的卡组织标签
  const cardNetworkTags = pos.basic_info?.supported_card_networks?.map(network => 
    `<span class="tag">${getCardNetworkLabel(network)}</span>`
  ).join('') || '<span class="info-value" style="color: #6b7280;">待勘察</span>'

  // 生成Contactless支持信息
  const contactlessSupport = []
  if (pos.basic_info?.supports_contactless) contactlessSupport.push('实体卡 Contactless')
  if (pos.basic_info?.supports_apple_pay) contactlessSupport.push('Apple Pay')
  if (pos.basic_info?.supports_google_pay) contactlessSupport.push('Google Pay')
  if (pos.basic_info?.supports_hce_simulation) contactlessSupport.push('HCE模拟')
  
  const contactlessTags = contactlessSupport.length > 0 
    ? contactlessSupport.map(support => `<span class="tag">${support}</span>`).join('')
    : '<span class="info-value" style="color: #6b7280;">待勘察</span>'

  // 生成手续费信息
  let feesSection = ''
  if (pos.fees && Object.keys(pos.fees).length > 0) {
    const feesData = pos.fees as FeesConfiguration
    const feeItems = Object.entries(feesData)
      .filter(([, config]) => config.enabled)
      .map(([network, config]) => {
        const rate = config.type === 'percentage'
          ? `${config.value}%`
          : `${config.value} ${config.currency || 'HKD'}`
        return `
          <div class="info-item">
            <div class="info-label">${getCardNetworkLabel(network)}</div>
            <div class="info-value">${rate}</div>
          </div>
        `
      }).join('')
    
    if (feeItems) {
      feesSection = `
        <div class="section">
          <h3 class="section-title">💳 手续费信息</h3>
          <div class="info-grid">
            ${feeItems}
          </div>
        </div>
      `
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>POS机信息卡片 - ${pos.merchant_name}</title>
      ${baseStyles}
      ${styleOverrides}
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">${pos.merchant_name}</h1>
          <p class="subtitle">📍 ${pos.address}</p>
        </div>
        
        <div class="content">
          <!-- 基本信息 -->
          <div class="section">
            <h3 class="section-title">🏪 基本信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">POS机型号</div>
                <div class="info-value">${pos.basic_info?.model || '待勘察'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">收单机构</div>
                <div class="info-value">${pos.basic_info?.acquiring_institution || '待勘察'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">收银位置</div>
                <div class="info-value">${pos.basic_info?.checkout_location || '待勘察'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">设备状态</div>
                <div class="info-value">
                  <span class="status-badge" style="background-color: ${getStatusColor(pos.status || 'unknown')}">
                    ${getStatusText(pos.status || 'unknown')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 支付支持 -->
          <div class="section">
            <h3 class="section-title">💳 支付支持</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">支持的卡组织</div>
                <div class="info-value">${cardNetworkTags}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Contactless 支持</div>
                <div class="info-value">${contactlessTags}</div>
              </div>
            </div>
          </div>

          ${feesSection}

          <!-- 位置信息 -->
          ${pos.latitude && pos.longitude ? `
          <div class="section">
            <h3 class="section-title">📍 位置信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">经纬度坐标</div>
                <div class="info-value">${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}</div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- 备注信息 -->
          ${pos.remarks ? `
          <div class="section">
            <h3 class="section-title">📝 备注信息</h3>
            <div class="info-item">
              <div class="info-value">${pos.remarks}</div>
            </div>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>导出时间: ${new Date().toLocaleString('zh-CN')} | 数据来源: Payments Maps</p>
          ${pos.created_at ? `<p>创建时间: ${formatDate(pos.created_at)}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `
}

// HTML导出功能
export const exportToHTML = async (data: any, filename: string, style: CardStyle = 'minimal') => {
  try {
    const template = getCardTemplate(style)
    const html = template(data)
    
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('HTML导出失败:', error)
    return false
  }
}

// PDF导出功能
export const exportToPDF = async (data: any, filename: string, style: CardStyle = 'minimal') => {
  try {
    const template = getCardTemplate(style)
    const html = template(data)
    
    // 创建临时容器
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '800px'
    document.body.appendChild(container)
    
    // 使用html2canvas生成图片
    const canvas = await html2canvas(container, {
      width: 800,
      height: 600,
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    // 移除临时容器
    document.body.removeChild(container)
    
    // 创建PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    })
    
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    
    // 下载PDF
    pdf.save(`${filename}.pdf`)
    
    return true
  } catch (error) {
    console.error('PDF导出失败:', error)
    return false
  }
}

// 通用导出函数
export const exportPOSData = async (pos: POSMachine, options: ExportOptions) => {
  const filename = `pos_${pos.merchant_name}_${new Date().toISOString().split('T')[0]}`
  
  switch (options.format) {
    case 'json':
      return exportToJSON(pos, filename)
    case 'html':
      return exportToHTML(pos, filename, options.style)
    case 'pdf':
      return exportToPDF(pos, filename, options.style)
    default:
      throw new Error(`不支持的导出格式: ${options.format}`)
  }
}

// 获取风格显示名称
export const getStyleDisplayName = (style: CardStyle): string => {
  switch (style) {
    case 'minimal': return '简约风格'
    case 'detailed': return '详细风格'
    case 'business': return '商务风格'
    case 'modern': return '现代风格'
    default: return '详细风格'
  }
}

// 获取格式显示名称
export const getFormatDisplayName = (format: ExportFormat): string => {
  switch (format) {
    case 'json': return 'JSON 数据'
    case 'html': return 'HTML 网页'
    case 'pdf': return 'PDF 文档'
    default: return 'JSON 数据'
  }
}