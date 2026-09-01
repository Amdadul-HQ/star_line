'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PublicRoute } from './tracking-preview';

/**
 * Headline whose words rise in one-by-one; an accent underline draws itself
 * beneath `highlightWord` once the words have landed. Pure CSS animations —
 * reduced-motion users get the finished state instantly.
 */
export function AnimatedHeadline({
  text,
  highlightWord,
  baseDelay = 0,
  className,
}: {
  text: string;
  highlightWord?: string;
  baseDelay?: number;
  className?: string;
}) {
  const words = text.split(' ');
  const underlineDelay = baseDelay + words.length * 90 + 250;

  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="word-rise"
          style={{ '--word-delay': `${baseDelay + i * 90}ms` } as React.CSSProperties}
        >
          {highlightWord && word === highlightWord ? (
            <span className="relative inline-block">
              {word}
              <svg
                className="hero-underline absolute -bottom-2 left-0 w-full text-amber-300"
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M4 9 Q 60 1 116 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ '--underline-delay': `${underlineDelay}ms` } as React.CSSProperties}
                />
              </svg>
            </span>
          ) : (
            word
          )}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h1>
  );
}

/** Animated road (scrolling lane dashes + a driving bus) for hero bottoms. */
export function RoadStrip() {
  return (
    <div className="road-strip" aria-hidden>
      <span className="road-bus">🚌</span>
    </div>
  );
}

/** Cycles through real routes ("Popular right now: Dhaka → Feni · ৳500"). */
export function RotatingRoutes({ routes }: { routes: PublicRoute[] }) {
  const t = useT();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (routes.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % routes.length), 2600);
    return () => clearInterval(timer);
  }, [routes.length]);

  if (routes.length === 0) return null;
  const route = routes[idx % routes.length];

  return (
    <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-brand-100">
      <span className="font-semibold uppercase tracking-wide text-brand-200 text-xs">
        {t('landing.popularNow')}
      </span>
      <span
        key={route.id}
        className={cn('inline-flex items-center gap-1.5 font-bold text-white', 'animate-[fade-up_0.45s_ease]')}
      >
        📍 {route.origin} → {route.destination}
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">
          ৳{route.baseFareBdt.toLocaleString()}
        </span>
      </span>
    </p>
  );
}
