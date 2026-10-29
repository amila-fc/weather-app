/**
 * jsdom has no layout engine, so every element reports a zero offset height and the virtualizer would
 * legitimately render an empty window. These helpers give the scroll container a viewport during a test.
 */
const CLIENT_HEIGHT_DESCRIPTOR = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
const CLIENT_WIDTH_DESCRIPTOR = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');

const define = (property: string, value: number) => {
  Object.defineProperty(Element.prototype, property, { configurable: true, get: () => value });
};

export const stubVirtualViewport = (height: number, width = 320): (() => void) => {
  define('clientHeight', height);
  define('clientWidth', width);

  return () => {
    if (CLIENT_HEIGHT_DESCRIPTOR) {
      Object.defineProperty(Element.prototype, 'clientHeight', CLIENT_HEIGHT_DESCRIPTOR);
    }
    if (CLIENT_WIDTH_DESCRIPTOR) {
      Object.defineProperty(Element.prototype, 'clientWidth', CLIENT_WIDTH_DESCRIPTOR);
    }
  };
};
