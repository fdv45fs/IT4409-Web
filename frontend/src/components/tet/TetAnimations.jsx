// ===== TẾT 2026 - ANIMATED COMPONENTS =====
// Các component animation: hoa rơi, pháo hoa, confetti, v.v.

import { useState, useEffect } from "react";
import { Sparkles, Star, Heart, Gem, CircleDot } from "lucide-react";
import {
    LanternIcon,
    ApricotBlossomIcon,
    PeachBlossomIcon,
    FireworkIcon
} from "./TetIcons";

// ===== FALLING PETALS =====
// Hoa đào và hoa mai rơi
export const FallingPetals = ({ count = 20 }) => {
    const petals = Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 8}s`,
        duration: `${10 + Math.random() * 8}s`,
        size: 14 + Math.random() * 10,
        type: Math.random() > 0.5 ? 'peach' : 'apricot',
    }));

    return (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
            {petals.map((petal) => (
                <div
                    key={petal.id}
                    className={`absolute animate-petal-fall ${petal.type === 'peach' ? 'text-pink-400' : 'text-yellow-400'}`}
                    style={{
                        left: petal.left,
                        animationDelay: petal.delay,
                        animationDuration: petal.duration,
                    }}
                >
                    {petal.type === 'peach' ? (
                        <PeachBlossomIcon style={{ width: petal.size, height: petal.size }} />
                    ) : (
                        <ApricotBlossomIcon style={{ width: petal.size, height: petal.size }} />
                    )}
                </div>
            ))}
        </div>
    );
};

// ===== FLOATING LANTERNS =====
// Đèn lồng bay
export const FloatingLanterns = () => {
    const lanterns = [
        { id: 1, left: '8%', top: '20%', delay: '0s', size: 36 },
        { id: 2, right: '10%', top: '25%', delay: '1s', size: 44 },
        { id: 3, left: '12%', bottom: '30%', delay: '0.5s', size: 32 },
        { id: 4, right: '15%', bottom: '35%', delay: '1.5s', size: 40 },
    ];

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            {lanterns.map((lantern) => (
                <div
                    key={lantern.id}
                    className="absolute animate-lantern-float text-red-500 opacity-30"
                    style={{
                        left: lantern.left,
                        right: lantern.right,
                        top: lantern.top,
                        bottom: lantern.bottom,
                        animationDelay: lantern.delay,
                    }}
                >
                    <LanternIcon style={{ width: lantern.size, height: lantern.size }} />
                </div>
            ))}
        </div>
    );
};

// ===== FIREWORKS =====
// Pháo hoa
export const Fireworks = ({ interval = 2500 }) => {
    const [fireworks, setFireworks] = useState([]);

    useEffect(() => {
        const createFirework = () => {
            const newFirework = {
                id: Date.now(),
                left: `${15 + Math.random() * 70}%`,
                top: `${10 + Math.random() * 35}%`,
                color: ['text-red-500', 'text-amber-500', 'text-yellow-400', 'text-pink-500', 'text-purple-500'][Math.floor(Math.random() * 5)],
            };
            setFireworks(prev => [...prev, newFirework]);
            setTimeout(() => {
                setFireworks(prev => prev.filter(f => f.id !== newFirework.id));
            }, 2000);
        };

        const intervalId = setInterval(createFirework, interval);
        createFirework();

        return () => clearInterval(intervalId);
    }, [interval]);

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {fireworks.map((fw) => (
                <div
                    key={fw.id}
                    className={`absolute ${fw.color} animate-firework`}
                    style={{ left: fw.left, top: fw.top }}
                >
                    <Sparkles className="h-10 w-10" />
                </div>
            ))}
        </div>
    );
};

// ===== CONFETTI =====
// Confetti rơi
export const Confetti = ({ count = 25 }) => {
    const confettiPieces = Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 12}s`,
        duration: `${6 + Math.random() * 6}s`,
        color: ['text-red-500', 'text-amber-400', 'text-yellow-400', 'text-pink-500', 'text-orange-500'][Math.floor(Math.random() * 5)],
        Icon: [Star, Heart, Gem, CircleDot, ApricotBlossomIcon, PeachBlossomIcon][Math.floor(Math.random() * 6)],
        size: 10 + Math.random() * 10,
    }));

    return (
        <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
            {confettiPieces.map((piece) => (
                <div
                    key={piece.id}
                    className={`absolute ${piece.color} animate-confetti opacity-50`}
                    style={{
                        left: piece.left,
                        animationDelay: piece.delay,
                        animationDuration: piece.duration,
                    }}
                >
                    <piece.Icon style={{ width: piece.size, height: piece.size }} />
                </div>
            ))}
        </div>
    );
};

// ===== FIREWORKS TOGGLE BUTTON =====
// Nút bật/tắt pháo hoa
export const FireworksToggle = ({ showFireworks, onToggle }) => (
    <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-amber-500 shadow-lg shadow-red-300 hover:scale-110 transition-all"
        title={showFireworks ? "Tắt pháo hoa" : "Bật pháo hoa"}
    >
        {showFireworks ? (
            <FireworkIcon className="h-7 w-7 text-white" />
        ) : (
            <Sparkles className="h-7 w-7 text-white" />
        )}
    </button>
);

// ===== WRAPPER COMPONENT =====
// Wrapper chứa tất cả animations
export const TetAnimatedEffects = ({ showFireworks = true }) => (
    <>
        <FallingPetals />
        <FloatingLanterns />
        {showFireworks && <Fireworks />}
        <Confetti />
    </>
);
