import { ForwardedRef, ReactNode, forwardRef, useEffect, useState } from 'react';

type Transition = {
  duration?: number;
  ease?: string;
};

type MotionRecord = Partial<CSSStyleDeclaration> | Record<string, string | number> | React.CSSProperties | undefined;

type MotionProps = React.HTMLAttributes<HTMLDivElement> & {
  initial?: MotionRecord;
  animate?: MotionRecord;
  exit?: MotionRecord;
  transition?: Transition;
};

const toStyleObject = (style?: MotionRecord): React.CSSProperties => ({ ...(style as React.CSSProperties) });

const buildTransition = (transition?: Transition) => {
  const duration = transition?.duration ?? 0.2;
  const ease = transition?.ease ?? 'ease-out';
  return `all ${duration}s ${ease}`;
};

const MotionDiv = (
  { initial, animate, exit: _exit, transition, style, children, ...rest }: MotionProps,
  ref: ForwardedRef<HTMLDivElement>
) => {
  const [currentStyle, setCurrentStyle] = useState<React.CSSProperties>(() => ({
    ...toStyleObject(style),
    ...toStyleObject(initial)
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      setCurrentStyle({
        ...toStyleObject(style),
        ...toStyleObject(animate),
        transition: buildTransition(transition)
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [animate, style, transition]);

  return (
    <div ref={ref} style={currentStyle} {...rest}>
      {children}
    </div>
  );
};

const motion = {
  div: forwardRef<HTMLDivElement, MotionProps>(MotionDiv)
};

const AnimatePresence = ({ children }: { children: ReactNode }) => <>{children}</>;

export { motion, AnimatePresence };
