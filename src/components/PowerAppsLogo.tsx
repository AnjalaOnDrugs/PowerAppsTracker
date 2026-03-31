import React from 'react';

export const PowerAppsLogo = ({ className = 'w-6 h-6' }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <g transform="rotate(45 128 128)">
                {/* Deep Purple Diamond Base */}
                <rect
                    x="68" y="68"
                    width="120" height="120"
                    rx="18"
                    fill="#7B1D80"
                />

                {/* Violet/Pink Overlapping Chevron */}
                <path
                    d="
            M 104 36 
            L 194 36 
            Q 220 36 220 62 
            L 220 152 
            Q 220 160 212 160
            L 182 160
            Q 174 160 174 152
            L 174 88
            Q 174 82 168 82
            L 104 82
            Q 96 82 96 74
            L 96 44
            Q 96 36 104 36 Z
          "
                    fill="url(#pa-grad)"
                />
            </g>
            <defs>
                <linearGradient id="pa-grad" x1="120" y1="36" x2="220" y2="160" gradientUnits="userSpaceOnUse">
                    {/* Matches the lighter pink to deeper violet transition */}
                    <stop stopColor="#DB73C2" />
                    <stop offset="1" stopColor="#B34B9C" />
                </linearGradient>
            </defs>
        </svg>
    );
};
