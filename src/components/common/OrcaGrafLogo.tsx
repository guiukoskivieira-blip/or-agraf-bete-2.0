/**
 * @file OrcaGrafLogo.tsx
 * @description Logo Oficial em SVG do OrçaGraf
 * @project OrçaGraf
 * 
 * DIRETRIZES:
 * - Sem textos anexados como "ORÇA" ou "GESTÃO COMERCIAL"
 * - Sem abreviações
 * - Preservação fiel do SVG oficial, transparência e proporções
 */

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'compact';
  showSubtitle?: boolean;
}

export const OrcaGrafIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 38,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="OrçaGraf Logo"
    >
      <defs>
        {/* Dark Container Gradient */}
        <linearGradient id="og_bg_grad" x1="16" y1="12" x2="104" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0B0F19" />
        </linearGradient>

        {/* Turquoise / Cyan Check Gradient */}
        <linearGradient id="og_cyan_left" x1="20" y1="35" x2="60" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="40%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>

        <linearGradient id="og_cyan_right" x1="100" y1="35" x2="60" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Back "A" Arch Gradient */}
        <linearGradient id="og_arch_grad" x1="30" y1="20" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Top "A" Cap Cyan Accent */}
        <linearGradient id="og_cap_grad" x1="45" y1="20" x2="75" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Soft shadow */}
        <filter id="og_shadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Rounded Squircle Background */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="26"
        fill="url(#og_bg_grad)"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Inner Decorative Subtle Glow */}
      <rect
        x="7.5"
        y="7.5"
        width="105"
        height="105"
        rx="24.5"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />

      {/* Back 'A' Legs and Arch */}
      <g filter="url(#og_shadow)">
        {/* Right Leg of A (slate tone) */}
        <path
          d="M60 22 L98 90 C100 94 97 98 92 98 C88 98 85 95 83 91 L60 48 L37 91 C35 95 32 98 28 98 C23 98 20 94 22 90 Z"
          fill="url(#og_arch_grad)"
        />

        {/* Top Dome of A */}
        <path
          d="M60 20 C64 20 67 23 68 27 L74 44 C71 47 65 49 60 49 C55 49 49 47 46 44 L52 27 C53 23 56 20 60 20 Z"
          fill="url(#og_cap_grad)"
        />

        {/* Inner Diamond Cutout */}
        <polygon
          points="60,42 70,62 60,78 50,62"
          fill="#0B0F19"
        />

        {/* Front Stylized Dynamic Checkmark / V Wings (Turquoise/Cyan Crest) */}
        {/* Left Wing */}
        <path
          d="M18 31 C18 29 20 28 22 30 L60 92 L60 72 L32 34 C30 31 27 30 25 30 L18 31 Z"
          fill="url(#og_cyan_left)"
        />

        {/* Right Wing */}
        <path
          d="M102 31 C102 29 100 28 98 30 L60 92 L60 72 L88 34 C90 31 93 30 95 30 L102 31 Z"
          fill="url(#og_cyan_right)"
        />

        {/* Center Ridge Highlight */}
        <path
          d="M60 72 L60 96 L61 95 L61 73 Z"
          fill="#FFFFFF"
          opacity="0.85"
        />
      </g>
    </svg>
  );
};

export const OrcaGrafLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  };

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <OrcaGrafIcon size={iconSizes[size]} />
    </div>
  );
};
