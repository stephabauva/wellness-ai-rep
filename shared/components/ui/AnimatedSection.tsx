import React, { ReactNode } from 'react';
import { useIntersectionObserver } from '../../../client/src/hooks/useIntersectionObserver';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scale';
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  delay = 0,
  animation = 'fadeUp'
}) => {
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  });

  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-700 ease-out';
    
    switch (animation) {
      case 'fadeUp':
        return `${baseClasses} ${isIntersecting 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
        }`;
      case 'fadeIn':
        return `${baseClasses} ${isIntersecting 
          ? 'opacity-100' 
          : 'opacity-0'
        }`;
      case 'slideLeft':
        return `${baseClasses} ${isIntersecting 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-8'
        }`;
      case 'slideRight':
        return `${baseClasses} ${isIntersecting 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-8'
        }`;
      case 'scale':
        return `${baseClasses} ${isIntersecting 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95'
        }`;
      default:
        return baseClasses;
    }
  };

  return (
    <div
      ref={elementRef}
      className={`${getAnimationClasses()} ${className}`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transform: 'translateZ(0)', // Enable hardware acceleration
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;