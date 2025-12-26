// ===== TẾT 2026 - DECORATIVE COMPONENTS =====
// Các component trang trí: câu đối, cành hoa, v.v.

import { ApricotBranchIcon, PeachBranchIcon } from "./TetIcons";

// ===== CÂU ĐỐI (COUPLETS) =====

// Câu đối trái - "ĐÓN XUÂN"
export const LeftCouplet = () => (
    <div className="fixed left-2 top-1/2 -translate-y-1/2 z-10 hidden lg:block animate-couplet-swing">
        <div className="relative">
            {/* Móc treo */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-4">
                <div className="w-full h-full bg-gradient-to-b from-yellow-600 to-yellow-700 rounded-t-full"></div>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-6 bg-red-800"></div>
            </div>
            {/* Câu đối */}
            <div className="relative bg-gradient-to-b from-red-600 via-red-700 to-red-800 rounded-lg shadow-2xl overflow-hidden" style={{ width: '55px', height: '340px' }}>
                {/* Viền vàng */}
                <div className="absolute inset-1 border-2 border-yellow-500 rounded pointer-events-none"></div>
                <div className="absolute inset-2 border border-yellow-600/50 rounded pointer-events-none"></div>
                {/* Nội dung */}
                <div className="h-full flex flex-col items-center justify-center py-6 gap-3">
                    {['Đ', 'Ó', 'N', ' ', 'X', 'U', 'Â', 'N'].map((char, i) => (
                        <span key={i} className="text-yellow-300 text-sm font-bold" style={{ fontFamily: 'serif', textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                            {char === ' ' ? '' : char}
                        </span>
                    ))}
                </div>
                {/* Tua */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b animate-sway"></div>
                    <div className="w-1.5 h-10 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b animate-sway" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b animate-sway" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>
        </div>
    </div>
);

// Câu đối phải - "PHÚC LỘC"
export const RightCouplet = () => (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-10 hidden lg:block animate-couplet-swing" style={{ animationDelay: '2s' }}>
        <div className="relative">
            {/* Móc treo */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-4">
                <div className="w-full h-full bg-gradient-to-b from-yellow-600 to-yellow-700 rounded-t-full"></div>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-6 bg-red-800"></div>
            </div>
            {/* Câu đối */}
            <div className="relative bg-gradient-to-b from-red-600 via-red-700 to-red-800 rounded-lg shadow-2xl overflow-hidden" style={{ width: '55px', height: '340px' }}>
                {/* Viền vàng */}
                <div className="absolute inset-1 border-2 border-yellow-500 rounded pointer-events-none"></div>
                <div className="absolute inset-2 border border-yellow-600/50 rounded pointer-events-none"></div>
                {/* Nội dung */}
                <div className="h-full flex flex-col items-center justify-center py-6 gap-3">
                    {['P', 'H', 'Ú', 'C', ' ', 'L', 'Ộ', 'C'].map((char, i) => (
                        <span key={i} className="text-yellow-300 text-sm font-bold" style={{ fontFamily: 'serif', textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                            {char === ' ' ? '' : char}
                        </span>
                    ))}
                </div>
                {/* Tua */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b animate-sway"></div>
                    <div className="w-1.5 h-10 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b animate-sway" style={{ animationDelay: '0.3s' }}></div>
                    <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-b animate-sway" style={{ animationDelay: '0.1s' }}></div>
                </div>
            </div>
        </div>
    </div>
);

// ===== CÀNH HOA (BRANCHES) =====

// Cành hoa mai (góc trái trên)
export const TopLeftBranch = () => (
    <div className="fixed left-0 top-0 z-0 pointer-events-none hidden md:block animate-branch-sway" style={{ transformOrigin: 'top left' }}>
        <ApricotBranchIcon className="w-32 h-64 opacity-80" style={{ transform: 'rotate(30deg) translateX(-20px)' }} />
    </div>
);

// Cành hoa đào (góc phải trên)
export const TopRightBranch = () => (
    <div className="fixed right-0 top-0 z-0 pointer-events-none hidden md:block animate-branch-sway" style={{ transformOrigin: 'top right', animationDelay: '2s' }}>
        <PeachBranchIcon className="w-32 h-64 opacity-80" style={{ transform: 'rotate(-30deg) translateX(20px) scaleX(-1)' }} />
    </div>
);

// ===== BACKGROUND DECORATIONS =====

// Background blurs/bokeh effect
export const TetBackgroundBlurs = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-64 w-64 rounded-full bg-gradient-to-br from-pink-300/40 to-red-300/40 blur-3xl animate-float"></div>
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-gradient-to-br from-amber-300/50 to-yellow-300/50 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-red-300/30 to-pink-300/30 blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute -right-32 bottom-10 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/40 to-orange-300/40 blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
    </div>
);

// ===== WRAPPER COMPONENTS =====

// Wrapper component chứa tất cả decorations tĩnh
export const TetStaticDecorations = () => (
    <>
        <LeftCouplet />
        <RightCouplet />
        <TopLeftBranch />
        <TopRightBranch />
        <TetBackgroundBlurs />
    </>
);
