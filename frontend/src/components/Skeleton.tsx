interface SkeletonBlockProps {
  width?: string;
  height?: string;
  className?: string;
}

/** Decorative placeholder shaped like the content it stands in for. */
export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = '1rem',
  className,
}) => (
  <span
    className={`skeleton skeleton--block${className ? ` ${className}` : ''}`}
    style={{ width, height }}
    aria-hidden="true"
  />
);

interface SkeletonTextProps {
  lines?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3 }) => (
  <span className="skeleton-text" aria-hidden="true">
    {Array.from({ length: lines }, (_, index) => (
      <span key={index} className="skeleton skeleton--text" />
    ))}
  </span>
);
