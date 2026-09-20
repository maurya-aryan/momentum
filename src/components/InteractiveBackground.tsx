'use client';

import { useEffect, useRef } from 'react';

/**
 * Fixed, full-viewport background: a slow-drifting dark gradient plus a
 * radial glow that follows the pointer. Pure CSS-variable updates (no
 * React state) so it never triggers a re-render on mousemove.
 */
export default function InteractiveBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleMove(x: number, y: number) {
      const { innerWidth, innerHeight } = window;
      el!.style.setProperty('--glow-x', `${(x / innerWidth) * 100}%`);
      el!.style.setProperty('--glow-y', `${(y / innerHeight) * 100}%`);
    }

    function onMouseMove(e: MouseEvent) {
      handleMove(e.clientX, e.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (t) handleMove(t.clientX, t.clientY);
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return <div ref={ref} className="app-background" aria-hidden="true" />;
}
