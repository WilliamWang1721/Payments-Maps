import React from 'react';
import { FaCcVisa, FaCcMastercard, FaCreditCard } from 'react-icons/fa';
import { SiApplepay, SiGooglepay, SiSamsungpay, SiNfc } from 'react-icons/si';

type PaymentType =
  | 'apple_pay'
  | 'google_pay'
  | 'samsung_pay'
  | 'foreign_cards'
  | 'contactless'
  | 'default';

interface PaymentIconProps {
  type: PaymentType;
  className?: string;
  size?: number;
}

const PaymentIcon: React.FC<PaymentIconProps> = ({ type, className = '', size = 24 }) => {
  const iconStyle: React.CSSProperties = { fontSize: size };

  switch (type) {
    case 'apple_pay':
      return <SiApplepay className={`text-black ${className}`} style={iconStyle} />;
    case 'google_pay':
      return <SiGooglepay className={`text-[#4285F4] ${className}`} style={iconStyle} />;
    case 'samsung_pay':
      return <SiSamsungpay className={`text-[#1428A0] ${className}`} style={iconStyle} />;
    case 'foreign_cards':
      return (
        <span className={`inline-flex ${className}`} style={iconStyle}>
          <FaCcVisa className="text-[#1A1F71]" />
          <FaCcMastercard className="text-[#EB001B] -ml-2" />
        </span>
      );
    case 'contactless':
      return <SiNfc className={`text-[#FC9432] ${className}`} style={iconStyle} />;
    default:
      return <FaCreditCard className={`text-gray-600 ${className}`} style={iconStyle} />;
  }
};

export default PaymentIcon;