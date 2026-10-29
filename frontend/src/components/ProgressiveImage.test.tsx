import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressiveImage } from './ProgressiveImage';

const SOURCE = '/src/assets/weather/clear.svg';

interface ObserverStub {
  trigger: (isIntersecting: boolean) => void;
  disconnect: () => void;
  observed: Element[];
}

const createIntersectionObserverStub = () => {
  const instances: ObserverStub[] = [];

  class StubIntersectionObserver {
    private readonly callback: IntersectionObserverCallback;
    observed: Element[] = [];

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push({
        trigger: (isIntersecting) => {
          this.callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        },
        disconnect: () => {},
        observed: this.observed,
      });
    }

    observe(element: Element) {
      this.observed.push(element);
    }

    unobserve() {}

    disconnect() {}
  }

  vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  return instances;
};

describe('ProgressiveImage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reserves the box with width and height and defers to lazy async decoding', () => {
    render(<ProgressiveImage src={SOURCE} alt="Clear sky" width={56} height={56} />);

    const image = screen.getByAltText('Clear sky');
    expect(image).toHaveAttribute('width', '56');
    expect(image).toHaveAttribute('height', '56');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('src', SOURCE);
  });

  it('shows a placeholder before the image loads and fades the image in afterwards', async () => {
    const { container } = render(
      <ProgressiveImage src={SOURCE} alt="Clear sky" width={56} height={56} />,
    );

    expect(container.querySelector('.progressive-image__placeholder')).toBeInTheDocument();
    expect(screen.getByAltText('Clear sky')).not.toHaveClass('progressive-image__img--loaded');

    await act(async () => {
      screen.getByAltText('Clear sky').dispatchEvent(new Event('load'));
    });

    expect(screen.getByAltText('Clear sky')).toHaveClass('progressive-image__img--loaded');
    expect(container.querySelector('.progressive-image__placeholder')).not.toBeInTheDocument();
  });

  it('does not request offscreen images until they approach the viewport', () => {
    const observers = createIntersectionObserverStub();

    render(<ProgressiveImage src={SOURCE} alt="Clear sky" width={56} height={56} />);

    expect(screen.queryByAltText('Clear sky')).not.toBeInTheDocument();
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toHaveLength(1);

    act(() => {
      observers[0].trigger(true);
    });

    expect(screen.getByAltText('Clear sky')).toHaveAttribute('src', SOURCE);
  });

  it('ignores intersections of other elements', () => {
    const observers = createIntersectionObserverStub();

    render(<ProgressiveImage src={SOURCE} alt="Clear sky" width={56} height={56} />);
    act(() => {
      observers[0].trigger(false);
    });

    expect(screen.queryByAltText('Clear sky')).not.toBeInTheDocument();
  });

  it('falls back to text instead of a broken image', async () => {
    const { container } = render(
      <ProgressiveImage src="/missing.svg" alt="Clear sky" fallbackText="No icon" width={56} height={56} />,
    );

    await act(async () => {
      screen.getByAltText('Clear sky').dispatchEvent(new Event('error'));
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No icon')).toBeInTheDocument();
    expect(container.querySelector('.progressive-image--fallback')).toBeInTheDocument();
  });

  it('uses the alt text as the fallback when no fallback text is given', async () => {
    render(<ProgressiveImage src="/missing.svg" alt="Snow" width={56} height={56} />);

    await act(async () => {
      screen.getByAltText('Snow').dispatchEvent(new Event('error'));
    });

    expect(screen.getByText('Snow')).toHaveClass('progressive-image__fallback-text');
  });

  it('renders without an IntersectionObserver stub, as in older browsers', () => {
    render(<ProgressiveImage src={SOURCE} alt="Clear sky" width={56} height={56} />);

    expect(screen.getByAltText('Clear sky')).toBeInTheDocument();
  });
});
