/* eslint-disable @typescript-eslint/no-empty-function */
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage(_data: unknown, _transfer?: Transferable[]): void {}
  terminate(): void {}
}

Object.defineProperty(globalThis, 'Worker', { value: MockWorker, writable: true });
