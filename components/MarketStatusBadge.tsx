import React from 'react';

interface MarketStatusBadgeProps {
  status: string;
}

export default function MarketStatusBadge({ status }: MarketStatusBadgeProps) {
  const getStyles = () => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'closed':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'settled':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStyles()}`}>
      {status}
    </span>
  );
}
