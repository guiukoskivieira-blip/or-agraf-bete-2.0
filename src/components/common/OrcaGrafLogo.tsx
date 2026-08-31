import React from 'react';
import orcaGrafLogo from '../../assets/orcagraf-logo-white.png';

interface LogoProps { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }
const widths = { sm: 'w-40', md: 'w-48', lg: 'w-56', xl: 'w-64' };

export const OrcaGrafLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => (
  <img src={orcaGrafLogo} alt="OrçaGraf — Gestão Comercial" className={`${widths[size]} h-auto object-contain select-none ${className}`} />
);
