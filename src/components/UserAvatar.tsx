import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  email,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
  }[size];

  // Calculate initials
  const displayName = name || (email ? email.split('@')[0] : 'U');
  const words = displayName.trim().split(/\s+/);
  let initials = 'U';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length > 0) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  const hasValidImage = src && !imageError && src.trim().length > 0 && !src.includes('placeholder');

  if (hasValidImage) {
    return (
      <img
        src={src}
        alt={displayName}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-[#E0E0DC] shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      title={displayName}
      className={`${sizeClasses} rounded-full bg-[#171717] text-[#FAFAF8] font-semibold flex items-center justify-center shrink-0 border border-[#2B2B2B] select-none tracking-wider ${className}`}
    >
      {initials}
    </div>
  );
};
