import React from 'react'

interface CardNetworkIconProps {
  network: string
  className?: string
}

const CardNetworkIcon: React.FC<CardNetworkIconProps> = ({ network, className = "w-8 h-6" }) => {
  // 统一使用深色系颜色，更专业的外观
  const getNetworkInfo = (network: string) => {
    switch (network) {
      case 'visa':
        return { 
          text: 'VISA', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'mastercard':
        return { 
          text: 'MC', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'mastercard_cn':
        return { 
          text: '万事达', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'unionpay':
        return { 
          text: '银联', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'amex':
        return { 
          text: 'AMEX', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'amex_cn':
        return { 
          text: '运通', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'jcb':
        return { 
          text: 'JCB', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'discover':
        return { 
          text: 'DISC', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'diners':
        return { 
          text: 'DINERS', 
          bgColor: 'bg-slate-700', 
          textColor: 'text-white'
        }
      case 'contactless':
        return { 
          text: 'NFC', 
          bgColor: 'bg-emerald-600', 
          textColor: 'text-white'
        }
      default:
        return { 
          text: 'CARD', 
          bgColor: 'bg-gray-500', 
          textColor: 'text-white'
        }
    }
  }

  const networkInfo = getNetworkInfo(network)
  
  return (
    <div className={`${className} ${networkInfo.bgColor} ${networkInfo.textColor} rounded flex items-center justify-center font-bold shadow-sm border border-white/10`}>
      <span className="text-xs px-1 truncate">
        {networkInfo.text}
      </span>
    </div>
  )
}

export default CardNetworkIcon