import React from 'react';
import { Layers } from 'lucide-react';

type BrandMarkProps = {
  className?: string;
  labelClassName?: string;
  markClassName?: string;
  compact?: boolean;
  subtitle?: string;
};

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', labelClassName = '', markClassName = '', compact = false, subtitle }) => (
  <span className={`brand-lockup ${className}`.trim()} data-brand-lockup="find-again">
    <span className={`brand-mark ${markClassName}`.trim()} aria-hidden="true" data-brand-mark="arctic-blue">
      <Layers />
    </span>
    {!compact && (
      <span className="brand-copy">
        <span className={`brand-name ${labelClassName}`.trim()}>Find Again</span>
        {subtitle && <span className="brand-subtitle">{subtitle}</span>}
      </span>
    )}
  </span>
);

