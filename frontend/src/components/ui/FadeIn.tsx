import { ReactNode, useEffect, useState } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export default function FadeIn({ 
  children, 
  delay = 0, 
  duration = 500,
  className = '',
  direction = 'up'
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up': return 'translateY(20px)';
        case 'down': return 'translateY(-20px)';
        case 'left': return 'translateX(20px)';
        case 'right': return 'translateX(-20px)';
        case 'none': return 'none';
        default: return 'translateY(20px)';
      }
    }
    return 'translateY(0) translateX(0)';
  };

  // Once animation is complete, remove transform to avoid breaking fixed positioned modals
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const completeTimer = setTimeout(() => {
        setAnimationComplete(true);
      }, duration);
      return () => clearTimeout(completeTimer);
    }
  }, [isVisible, duration]);

  return (
    <div
      className={`${className} overflow-x-hidden`}
      style={{
        opacity: isVisible ? 1 : 0,
        // Remove transform after animation to fix modal positioning
        transform: animationComplete ? 'none' : getTransform(),
        transition: animationComplete 
          ? 'none' 
          : `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggeredFadeInProps {
  children: ReactNode[];
  baseDelay?: number;
  staggerDelay?: number;
  duration?: number;
  className?: string;
  itemClassName?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function StaggeredFadeIn({
  children,
  baseDelay = 0,
  staggerDelay = 100,
  duration = 500,
  className = '',
  itemClassName = '',
  direction = 'up'
}: StaggeredFadeInProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <FadeIn
          key={index}
          delay={baseDelay + index * staggerDelay}
          duration={duration}
          className={itemClassName}
          direction={direction}
        >
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
