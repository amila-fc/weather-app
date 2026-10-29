import { useEffect, useRef, useState } from 'react';

/** Neutral 8x8 data URI: the placeholder never costs a network request. */
const PLACEHOLDER_DATA_URI =
  'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22%3E%3Crect width=%228%22 height=%228%22 fill=%22%23c9d4e2%22/%3E%3C/svg%3E';

const INTERSECTION_MARGIN = '200px';

const supportsIntersectionObserver = (): boolean =>
  typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';

export interface ProgressiveImageProps {
  src: string;
  /** Required: an unlabelled image is never rendered, which keeps the component accessible by construction. */
  alt: string;
  width: number;
  height: number;
  /** Shown instead of the (broken) image when loading fails; defaults to the alt text. */
  fallbackText?: string;
  placeholderSrc?: string;
  className?: string;
  /** Grows the 2-line placeholder into a real blurred preview when a tiny thumbnail is available. */
  blur?: boolean;
}

type LoadState = 'loading' | 'loaded' | 'error';

/**
 * Renders a cheap placeholder, then the real image once it approaches the viewport. Width and height are
 * always set, so the reserved space keeps layout shift at zero.
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  width,
  height,
  fallbackText,
  placeholderSrc = PLACEHOLDER_DATA_URI,
  className,
  blur = true,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(() => !supportsIntersectionObserver());
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    if (isNearViewport || !supportsIntersectionObserver()) {
      return undefined;
    }

    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: INTERSECTION_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isNearViewport]);

  const classes = ['progressive-image', className].filter(Boolean).join(' ');

  if (loadState === 'error') {
    return (
      <span className={`${classes} progressive-image--fallback`} style={{ width, height }}>
        <span className="progressive-image__fallback-text">{fallbackText ?? alt}</span>
      </span>
    );
  }

  return (
    <span className={classes} ref={containerRef} style={{ width, height }}>
      {loadState === 'loading' && (
        <span
          className={`progressive-image__placeholder${blur ? ' progressive-image__placeholder--blur' : ''}`}
          style={{ backgroundImage: `url("${placeholderSrc}")` }}
          aria-hidden="true"
        />
      )}
      {isNearViewport && (
        <img
          className={`progressive-image__img${loadState === 'loaded' ? ' progressive-image__img--loaded' : ''}`}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadState('loaded')}
          onError={() => setLoadState('error')}
        />
      )}
    </span>
  );
};
