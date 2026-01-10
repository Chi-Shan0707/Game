import React from 'react';

interface BetButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant: 'yes' | 'no';
  label?: string;
}

export default function BetButton({ onClick, loading, disabled, variant, label }: BetButtonProps) {
  const baseStyles = "w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-sm flex items-center justify-center";
  const variants = {
    yes: "bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300",
    no: "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {loading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        label || (variant === 'yes' ? 'Buy Yes' : 'Buy No')
      )}
    </button>
  );
}
