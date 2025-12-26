// ===== TẾT 2026 - AUTH LAYOUT =====
// Layout cho các trang xác thực (Login, Register, Forgot Password...)

import { Link } from "react-router-dom";
import {
    TetStaticDecorations
} from "./TetDecorations";
import {
    FallingPetals,
    FloatingLanterns
} from "./TetAnimations";
import {
    LanternIcon,
    HorseIcon,
    ApricotBlossomIcon,
    PeachBlossomIcon,
    RedEnvelopeIcon,
    SparkleDecor,
} from "./TetIcons";

/**
 * TetAuthLayout - Layout cho các trang xác thực với theme Tết
 * 
 * @param {Object} props
 * @param {string} props.title - Tiêu đề trang
 * @param {string} props.subtitle - Phụ đề
 * @param {React.ReactNode} props.children - Form content
 * @param {React.ReactNode} props.footer - Footer content (link đăng ký/đăng nhập)
 */
export const TetAuthLayout = ({
    title,
    subtitle,
    children,
    footer,
}) => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-red-50 via-amber-50 to-yellow-50">
            {/* Decorations */}
            <TetStaticDecorations />
            <FallingPetals count={12} />
            <FloatingLanterns />

            {/* Background Blurs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 top-20 h-64 w-64 rounded-full bg-gradient-to-br from-pink-300/30 to-red-300/30 blur-3xl animate-float"></div>
                <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-gradient-to-br from-amber-300/40 to-yellow-300/40 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-20 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-red-300/20 to-pink-300/20 blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-white/90 backdrop-blur-sm shadow-2xl shadow-amber-200/50">
                        {/* Top Gradient Border */}
                        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 animate-shimmer"></div>

                        {/* Header Section */}
                        <div className="relative bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-8 py-8 text-center text-white">
                            {/* Floating decorations */}
                            <div className="absolute left-4 top-4 opacity-30">
                                <ApricotBlossomIcon className="h-8 w-8 animate-bloom" />
                            </div>
                            <div className="absolute right-4 top-4 opacity-30">
                                <PeachBlossomIcon className="h-8 w-8 animate-bloom" style={{ animationDelay: '0.5s' }} />
                            </div>
                            <div className="absolute bottom-4 left-1/4 opacity-20">
                                <LanternIcon className="h-6 w-6 animate-swing" />
                            </div>
                            <div className="absolute bottom-4 right-1/4 opacity-20">
                                <LanternIcon className="h-6 w-6 animate-swing" style={{ animationDelay: '1.5s' }} />
                            </div>

                            {/* Logo */}
                            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                                <HorseIcon className="h-10 w-10 text-white animate-heartbeat" />
                                <SparkleDecor className="-right-1 -top-1" />
                            </div>

                            {/* Brand */}
                            <Link to="/" className="inline-block">
                                <p className="text-sm font-medium uppercase tracking-wider text-yellow-200">
                                    Hust Collab Platform
                                </p>
                            </Link>

                            {/* Title */}
                            <h1 className="mt-3 text-2xl font-bold lg:text-3xl">{title}</h1>

                            {/* Subtitle */}
                            {subtitle && (
                                <p className="mt-2 text-sm text-red-100">{subtitle}</p>
                            )}
                        </div>

                        {/* Form Section */}
                        <div className="relative px-8 py-8">
                            {/* Decorative corners */}
                            <div className="absolute left-2 top-2 opacity-20">
                                <ApricotBlossomIcon className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div className="absolute right-2 top-2 opacity-20">
                                <PeachBlossomIcon className="h-5 w-5 text-pink-400" />
                            </div>

                            {children}

                            {/* Footer */}
                            {footer && (
                                <div className="mt-8 text-center text-sm text-gray-500">
                                    {footer}
                                </div>
                            )}
                        </div>

                        {/* Bottom decoration */}
                        <div className="flex items-center justify-center gap-4 border-t border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 py-4">
                            {[RedEnvelopeIcon, LanternIcon, HorseIcon, ApricotBlossomIcon, PeachBlossomIcon].map((Icon, i) => (
                                <Icon
                                    key={i}
                                    className={`h-5 w-5 ${i % 2 === 0 ? 'text-red-500' : 'text-amber-500'} animate-bounce`}
                                    style={{ animationDelay: `${i * 0.1}s`, animationDuration: '2s' }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* New Year Greeting */}
                    <div className="mt-6 text-center">
                        <p className="text-sm font-medium text-amber-700 flex items-center justify-center gap-2">
                            <LanternIcon className="h-4 w-4 text-red-500 animate-swing" />
                            <span>Chúc Mừng Năm Mới Bính Ngọ 2026</span>
                            <LanternIcon className="h-4 w-4 text-red-500 animate-swing" style={{ animationDelay: '1.5s' }} />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TetAuthLayout;
