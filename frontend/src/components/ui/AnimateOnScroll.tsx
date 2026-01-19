import { ReactNode, useEffect, useRef, useState } from 'react';

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  animation?: 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export default function AnimateOnScroll({
  children,
  className = '',
  animation = 'fadeUp',
  delay = 0,
  duration = 600,
  threshold = 0.1,
  once = true,
}: AnimateOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          if (once && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, threshold, once]);

  const getInitialStyles = () => {
    const base = { opacity: 0, transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` };
    switch (animation) {
      case 'fadeUp':
        return { ...base, transform: 'translateY(40px)' };
      case 'fadeDown':
        return { ...base, transform: 'translateY(-40px)' };
      case 'fadeLeft':
        return { ...base, transform: 'translateX(40px)' };
      case 'fadeRight':
        return { ...base, transform: 'translateX(-40px)' };
      case 'scale':
        return { ...base, transform: 'scale(0.9)' };
      case 'fade':
        return base;
      default:
        return { ...base, transform: 'translateY(40px)' };
    }
  };

  const getVisibleStyles = () => ({
    opacity: 1,
    transform: 'translateY(0) translateX(0) scale(1)',
    transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  });

  return (
    <div
      ref={ref}
      className={className}
      style={isVisible ? getVisibleStyles() : getInitialStyles()}
    >
      {children}
    </div>
  );
}

interface StaggeredAnimateProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  animation?: 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'scale' | 'fade';
  baseDelay?: number;
  staggerDelay?: number;
  duration?: number;
}

export function StaggeredAnimate({
  children,
  className = '',
  itemClassName = '',
  animation = 'fadeUp',
  baseDelay = 0,
  staggerDelay = 100,
  duration = 600,
}: StaggeredAnimateProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimateOnScroll
          key={index}
          animation={animation}
          delay={baseDelay + index * staggerDelay}
          duration={duration}
          className={itemClassName}
        >
          {child}
        </AnimateOnScroll>
      ))}
    </div>
  );
}
