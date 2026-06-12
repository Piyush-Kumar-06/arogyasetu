import React from 'react';

export default function DataField({ label, value, isLocked }) {
  return (
    <div className="border-b border-gray-100 py-3">
      <span className="text-[10px] uppercase tracking-widest text-[#718096] block mb-1 font-semibold">
        {label}
      </span>
      <div className="flex items-center space-x-2">
        {isLocked ? (
          <>
            <span className="font-mono text-sm tracking-widest text-[#718096]">••••••••</span>
            <svg className="w-3.5 h-3.5 text-[#718096]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </>
        ) : (
          <span
            className={`font-mono text-sm text-[#1A365D] font-medium transition-all duration-300 opacity-100 transform translate-x-0 ${
              (label.toLowerCase().includes('medication') ||
               label.toLowerCase().includes('drug') ||
               label.toLowerCase().includes('allergy') ||
               label.toLowerCase().includes('treatment')) ? 'notranslate' : ''
            }`}
            translate={
              (label.toLowerCase().includes('medication') ||
               label.toLowerCase().includes('drug') ||
               label.toLowerCase().includes('allergy') ||
               label.toLowerCase().includes('treatment')) ? 'no' : undefined
            }
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
