import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 the first time it scrolls into view, like an instrument
 * powering on. The static HTML (and anyone who asks for reduced motion) gets the final
 * number straight away, and later changes simply show the new value.
 */
export function useCountUp<T extends Element>(value: number, duration = 900) {
  const ref = useRef<T>(null);
  const started = useRef(false);
  // null = not counting: show the real value.
  const [counting, setCounting] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // Ease out: quick at first, settling on the value.
        setCounting(t < 1 ? Math.round(value * (1 - (1 - t) ** 3)) : null);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Stopped mid-count (the value changed): never leave a half-counted number on screen.
      setCounting(null);
    };
  }, [value, duration]);

  return { ref, value: counting ?? value };
}
