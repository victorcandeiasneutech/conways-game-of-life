/* eslint-disable @typescript-eslint/no-empty-function */
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage(_data: unknown, _transfer?: Transferable[]): void {}
  terminate(): void {}
}

Object.defineProperty(globalThis, 'Worker', { value: MockWorker, writable: true });

class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext(): null {
    return null;
  }
}

HTMLCanvasElement.prototype.transferControlToOffscreen = function () {
  return new MockOffscreenCanvas(this.width, this.height) as unknown as OffscreenCanvas;
};
