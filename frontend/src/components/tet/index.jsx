// ===== TẾT 2026 - MAIN EXPORT =====
// Export tất cả components Tết từ một file duy nhất

// Icons
export {
    LanternIcon,
    HorseIcon,
    RedEnvelopeIcon,
    FireworkIcon,
    CoinIcon,
    ApricotBlossomIcon,
    PeachBlossomIcon,
    ApricotBranchIcon,
    PeachBranchIcon,
    SparkleDecor,
    LuckyCoin,
} from "./TetIcons";

// Decorations (static)
export {
    LeftCouplet,
    RightCouplet,
    TopLeftBranch,
    TopRightBranch,
    TetBackgroundBlurs,
    TetStaticDecorations,
} from "./TetDecorations";

// Animations (dynamic)
export {
    FallingPetals,
    FloatingLanterns,
    Fireworks,
    Confetti,
    FireworksToggle,
    TetAnimatedEffects,
} from "./TetAnimations";

// Header
export { TetHeader } from "./TetHeader";

// Auth Layout
export { TetAuthLayout } from "./TetAuthLayout";

// ===== PRESET THEME WRAPPER =====
// Component bọc toàn bộ theme Tết

import { useState } from "react";
import { TetStaticDecorations } from "./TetDecorations";
import { TetAnimatedEffects, FireworksToggle } from "./TetAnimations";

/**
 * TetThemeWrapper - Bọc toàn bộ theme Tết cho một trang
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Nội dung trang
 * @param {boolean} props.showAnimations - Hiển thị animations (mặc định: true)
 * @param {boolean} props.showDecorations - Hiển thị decorations (mặc định: true)
 * @param {boolean} props.showFireworksToggle - Hiển thị nút bật/tắt pháo hoa (mặc định: true)
 * @param {string} props.className - Class bổ sung cho container
 */
export const TetThemeWrapper = ({
    children,
    showAnimations = true,
    showDecorations = true,
    showFireworksToggle = true,
    className = ""
}) => {
    const [showFireworks, setShowFireworks] = useState(true);

    return (
        <div className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-red-50 via-amber-50 to-yellow-50 ${className}`}>
            {/* Static Decorations */}
            {showDecorations && <TetStaticDecorations />}

            {/* Animated Effects */}
            {showAnimations && <TetAnimatedEffects showFireworks={showFireworks} />}

            {/* Page Content */}
            {children}

            {/* Fireworks Toggle Button */}
            {showAnimations && showFireworksToggle && (
                <FireworksToggle
                    showFireworks={showFireworks}
                    onToggle={() => setShowFireworks(!showFireworks)}
                />
            )}
        </div>
    );
};

export default TetThemeWrapper;
