// ===== TẾT 2026 - HEADER COMPONENT =====
// Header với theme Tết cho toàn ứng dụng

import { PartyPopper } from "lucide-react";
import { HorseIcon, SparkleDecor, LuckyCoin } from "./TetIcons";
import UserMenu from "../UserMenu.jsx";

/**
 * TetHeader - Header component với theme Tết
 * 
 * @param {Object} props
 * @param {string} props.title - Tiêu đề (mặc định: "HUST Collab Platform")
 * @param {string} props.subtitle - Phụ đề (mặc định: lời chúc năm mới)
 * @param {boolean} props.showUserMenu - Hiển thị user menu (mặc định: true)
 * @param {boolean} props.showLuckyCoin - Hiển thị đồng xu may mắn (mặc định: true)
 * @param {React.ReactNode} props.rightContent - Nội dung bên phải tùy chỉnh
 * @param {React.ReactNode} props.leftContent - Nội dung bên trái tùy chỉnh (thay thế logo)
 */
export const TetHeader = ({
    title = "HUST Collab Platform",
    subtitle = "Chúc Mừng Năm Mới Bính Ngọ 2026",
    showUserMenu = true,
    showLuckyCoin = true,
    rightContent,
    leftContent,
}) => {
    return (
        <header className="sticky top-0 z-20 border-b border-red-200/50 bg-white/70 backdrop-blur-lg">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                {/* Left side - Logo & Title */}
                <div className="flex items-center gap-3">
                    {leftContent ? (
                        leftContent
                    ) : (
                        <>
                            <div className="relative">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-amber-500 shadow-lg shadow-red-300 animate-glow-pulse">
                                    <HorseIcon className="h-7 w-7 text-white animate-heartbeat" />
                                </div>
                                <SparkleDecor className="-right-1 -top-1" />
                                <SparkleDecor className="-left-1 -bottom-1" delay="0.5s" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold animate-rainbow-text">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                        <PartyPopper className="h-3 w-3 animate-bounce" style={{ animationDuration: '1s' }} />
                                        <span>{subtitle}</span>
                                        <PartyPopper className="h-3 w-3 animate-bounce" style={{ animationDuration: '1s', animationDelay: '0.5s' }} />
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center gap-3">
                    {rightContent}
                    {showLuckyCoin && <LuckyCoin />}
                    {showUserMenu && <UserMenu />}
                </div>
            </div>
        </header>
    );
};

export default TetHeader;
