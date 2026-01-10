import React from 'react';

interface ProfitCalculatorProps {
  amount: number;
  odds: number;
  feeRate: number;
}

export default function ProfitCalculator({ amount, odds, feeRate }: ProfitCalculatorProps) {
  const fee = Math.floor(amount * feeRate);
  const netAmount = amount - fee;
  const potentialPayout = Math.floor(netAmount * odds);
  const profit = potentialPayout - amount;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mt-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Handling Fee ({feeRate * 100}%)</span>
        <span className="font-mono text-gray-700">-{fee} pts</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Net Investment</span>
        <span className="font-mono text-gray-700">{netAmount} pts</span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <span className="font-semibold text-gray-700">Potential Profit</span>
        <span className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {profit > 0 ? '+' : ''}{profit.toLocaleString()} pts
        </span>
      </div>
    </div>
  );
}
