import React from 'react';
import { Badge } from '@shared/components/ui/badge';
import { Shield, Lock, Smartphone, Eye, EyeOff, CheckCircle, AlertTriangle, Server } from 'lucide-react';
import { cn } from '@shared/utilities/cn';

export interface PrivacyBadgeProps {
  variant: 'encrypted' | 'local-storage' | 'server-stored' | 'ai-accessible' | 'ai-restricted' | 'gdpr-compliant';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  tooltip?: string;
}

const privacyConfig = {
  encrypted: {
    icon: Lock,
    text: 'Encrypted',
    emoji: '🔒',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Data is encrypted at rest and in transit'
  },
  'local-storage': {
    icon: Smartphone,
    text: 'Local Storage',
    emoji: '📱',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Stored locally on your device'
  },
  'server-stored': {
    icon: Server,
    text: 'Server Stored',
    emoji: '☁️',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Securely stored on encrypted servers'
  },
  'ai-accessible': {
    icon: Eye,
    text: 'AI Accessible',
    emoji: '🤖',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'AI can access this data for personalized insights'
  },
  'ai-restricted': {
    icon: EyeOff,
    text: 'AI Restricted',
    emoji: '🚫',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'AI cannot access this data'
  },
  'gdpr-compliant': {
    icon: CheckCircle,
    text: 'GDPR Compliant',
    emoji: '✅',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Complies with GDPR privacy regulations'
  }
};

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  variant,
  size = 'md',
  className = '',
  showIcon = true,
  tooltip
}) => {
  const config = privacyConfig[variant];
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 h-6',
    md: 'text-sm px-3 py-1.5 h-8',
    lg: 'text-base px-4 py-2 h-10'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.color,
        sizeClasses[size],
        'font-medium border inline-flex items-center gap-1.5 transition-all hover:shadow-sm',
        className
      )}
      title={tooltip || config.description}
    >
      {showIcon && (
        <span className="flex items-center">
          <span className="mr-1">{config.emoji}</span>
          <IconComponent className={iconSizes[size]} />
        </span>
      )}
      <span className="truncate">{config.text}</span>
    </Badge>
  );
};

export interface PrivacyIndicatorGroupProps {
  indicators: PrivacyBadgeProps['variant'][];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export const PrivacyIndicatorGroup: React.FC<PrivacyIndicatorGroupProps> = ({
  indicators,
  size = 'md',
  className = '',
  layout = 'horizontal'
}) => {
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-2',
    vertical: 'flex flex-col gap-2'
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {indicators.map((variant, index) => (
        <PrivacyBadge
          key={`${variant}-${index}`}
          variant={variant}
          size={size}
        />
      ))}
    </div>
  );
};

export interface PrivacyStatusProps {
  encrypted: boolean;
  localStorage: boolean;
  aiAccessible: boolean;
  gdprCompliant?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PrivacyStatus: React.FC<PrivacyStatusProps> = ({
  encrypted,
  localStorage,
  aiAccessible,
  gdprCompliant = true,
  className = '',
  size = 'md'
}) => {
  const indicators: PrivacyBadgeProps['variant'][] = [];

  if (encrypted) {
    indicators.push('encrypted');
  }
  
  if (localStorage) {
    indicators.push('local-storage');
  } else {
    indicators.push('server-stored');
  }
  
  if (aiAccessible) {
    indicators.push('ai-accessible');
  } else {
    indicators.push('ai-restricted');
  }
  
  if (gdprCompliant) {
    indicators.push('gdpr-compliant');
  }

  return (
    <PrivacyIndicatorGroup
      indicators={indicators}
      size={size}
      className={className}
    />
  );
};