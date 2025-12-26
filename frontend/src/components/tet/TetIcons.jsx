// ===== TẾT 2026 - CUSTOM SVG ICONS =====
// Các icon SVG tùy chỉnh cho theme Tết Nguyên Đán

import { Sparkles } from "lucide-react";

// Đèn lồng đỏ
export const LanternIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <path d="M12 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 4c-3 0-6 2-6 6v4c0 4 3 6 6 6s6-2 6-6v-4c0-4-3-6-6-6z" fill="currentColor" opacity="0.3" />
        <path d="M12 4c-3 0-6 2-6 6v4c0 4 3 6 6 6s6-2 6-6v-4c0-4-3-6-6-6z" stroke="currentColor" strokeWidth="2" />
        <path d="M9 20v2M15 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 10h8M8 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
);

// Con ngựa (năm Bính Ngọ 2026)
export const HorseIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <path d="M5 11c0-4 3-7 7-7 2 0 4 1 5 2l2-1v3l-1 1c0 2 1 4 1 6v5h-3v-4c-1 1-3 2-5 2-4 0-6-3-6-7z" fill="currentColor" opacity="0.3" />
        <path d="M5 11c0-4 3-7 7-7 2 0 4 1 5 2l2-1v3l-1 1c0 2 1 4 1 6v5h-3v-4c-1 1-3 2-5 2-4 0-6-3-6-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="9" r="1" fill="currentColor" />
        <path d="M3 21h4v-3c0-1-1-2-2-2s-2 1-2 2v3z" stroke="currentColor" strokeWidth="2" />
    </svg>
);

// Bao lì xì
export const RedEnvelopeIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 9v-3M12 18v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 8h16" stroke="currentColor" strokeWidth="2" />
    </svg>
);

// Pháo hoa
export const FireworkIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// Đồng xu may mắn
export const CoinIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.3" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="8" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

// Hoa mai (5 cánh vàng)
export const ApricotBlossomIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        {/* 5 cánh hoa mai */}
        <ellipse cx="12" cy="4" rx="2.5" ry="3.5" fill="currentColor" opacity="0.8" />
        <ellipse cx="19.5" cy="9" rx="2.5" ry="3.5" fill="currentColor" opacity="0.8" transform="rotate(72 12 12)" />
        <ellipse cx="17" cy="18" rx="2.5" ry="3.5" fill="currentColor" opacity="0.8" transform="rotate(144 12 12)" />
        <ellipse cx="7" cy="18" rx="2.5" ry="3.5" fill="currentColor" opacity="0.8" transform="rotate(216 12 12)" />
        <ellipse cx="4.5" cy="9" rx="2.5" ry="3.5" fill="currentColor" opacity="0.8" transform="rotate(288 12 12)" />
    </svg>
);

// Hoa đào (5 cánh hồng)
export const PeachBlossomIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
        <circle cx="12" cy="12" r="2" fill="#fbbf24" />
        {/* 5 cánh hoa đào */}
        <path d="M12 3c-1.5 0-2.5 1.5-2.5 3s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-3-2.5-3z" fill="currentColor" opacity="0.9" />
        <path d="M12 3c-1.5 0-2.5 1.5-2.5 3s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-3-2.5-3z" fill="currentColor" opacity="0.9" transform="rotate(72 12 12)" />
        <path d="M12 3c-1.5 0-2.5 1.5-2.5 3s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-3-2.5-3z" fill="currentColor" opacity="0.9" transform="rotate(144 12 12)" />
        <path d="M12 3c-1.5 0-2.5 1.5-2.5 3s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-3-2.5-3z" fill="currentColor" opacity="0.9" transform="rotate(216 12 12)" />
        <path d="M12 3c-1.5 0-2.5 1.5-2.5 3s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-3-2.5-3z" fill="currentColor" opacity="0.9" transform="rotate(288 12 12)" />
    </svg>
);

// Cành mai
export const ApricotBranchIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 100 200" fill="none" className={className} {...props}>
        {/* Cành chính */}
        <path d="M50 200 Q45 150 55 100 Q60 50 45 0" stroke="#8B4513" strokeWidth="4" fill="none" />
        {/* Cành phụ */}
        <path d="M52 160 Q70 140 85 130" stroke="#8B4513" strokeWidth="2.5" fill="none" />
        <path d="M48 120 Q25 100 15 85" stroke="#8B4513" strokeWidth="2.5" fill="none" />
        <path d="M55 80 Q75 60 90 50" stroke="#8B4513" strokeWidth="2" fill="none" />
        <path d="M50 50 Q30 35 20 20" stroke="#8B4513" strokeWidth="2" fill="none" />
        {/* Hoa mai */}
        <g className="animate-bloom">
            <circle cx="85" cy="130" r="8" fill="#fbbf24" />
            <circle cx="85" cy="130" r="3" fill="#f59e0b" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '0.5s' }}>
            <circle cx="15" cy="85" r="7" fill="#fbbf24" />
            <circle cx="15" cy="85" r="2.5" fill="#f59e0b" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '1s' }}>
            <circle cx="90" cy="50" r="6" fill="#fbbf24" />
            <circle cx="90" cy="50" r="2" fill="#f59e0b" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '1.5s' }}>
            <circle cx="20" cy="20" r="7" fill="#fbbf24" />
            <circle cx="20" cy="20" r="2.5" fill="#f59e0b" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '0.3s' }}>
            <circle cx="55" cy="100" r="5" fill="#fbbf24" />
            <circle cx="55" cy="100" r="2" fill="#f59e0b" />
        </g>
        {/* Nụ hoa */}
        <circle cx="70" cy="110" r="3" fill="#fcd34d" />
        <circle cx="35" cy="65" r="3" fill="#fcd34d" />
        <circle cx="60" cy="30" r="2.5" fill="#fcd34d" />
    </svg>
);

// Cành đào
export const PeachBranchIcon = ({ className = "", ...props }) => (
    <svg viewBox="0 0 100 200" fill="none" className={className} {...props}>
        {/* Cành chính */}
        <path d="M50 200 Q55 150 45 100 Q40 50 55 0" stroke="#8B4513" strokeWidth="4" fill="none" />
        {/* Cành phụ */}
        <path d="M48 160 Q30 140 15 130" stroke="#8B4513" strokeWidth="2.5" fill="none" />
        <path d="M52 120 Q75 100 85 85" stroke="#8B4513" strokeWidth="2.5" fill="none" />
        <path d="M45 80 Q25 60 10 50" stroke="#8B4513" strokeWidth="2" fill="none" />
        <path d="M50 50 Q70 35 80 20" stroke="#8B4513" strokeWidth="2" fill="none" />
        {/* Hoa đào */}
        <g className="animate-bloom">
            <circle cx="15" cy="130" r="8" fill="#f472b6" />
            <circle cx="15" cy="130" r="3" fill="#fbbf24" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '0.7s' }}>
            <circle cx="85" cy="85" r="7" fill="#f472b6" />
            <circle cx="85" cy="85" r="2.5" fill="#fbbf24" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '0.3s' }}>
            <circle cx="10" cy="50" r="6" fill="#f472b6" />
            <circle cx="10" cy="50" r="2" fill="#fbbf24" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '1.2s' }}>
            <circle cx="80" cy="20" r="7" fill="#f472b6" />
            <circle cx="80" cy="20" r="2.5" fill="#fbbf24" />
        </g>
        <g className="animate-bloom" style={{ animationDelay: '0.5s' }}>
            <circle cx="45" cy="100" r="5" fill="#f472b6" />
            <circle cx="45" cy="100" r="2" fill="#fbbf24" />
        </g>
        {/* Nụ hoa */}
        <circle cx="30" cy="115" r="3" fill="#f9a8d4" />
        <circle cx="65" cy="70" r="3" fill="#f9a8d4" />
        <circle cx="40" cy="35" r="2.5" fill="#f9a8d4" />
    </svg>
);

// Sparkle decoration helper
export const SparkleDecor = ({ className = "", delay = "0s" }) => (
    <div className={`absolute animate-sparkle ${className}`} style={{ animationDelay: delay }}>
        <Sparkles className="h-3 w-3 text-yellow-400" />
    </div>
);

// Lucky Coin Component
export const LuckyCoin = ({ className = "" }) => (
    <div className={`inline-flex items-center justify-center ${className}`}>
        <div className="relative h-8 w-8 animate-coin-spin" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-lg">
                <CoinIcon className="h-5 w-5 text-amber-900" />
            </div>
        </div>
    </div>
);
