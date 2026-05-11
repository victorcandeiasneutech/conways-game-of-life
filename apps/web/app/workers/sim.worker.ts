import { step } from '@conways-game-of-life/sim';

type TickMessage = {
  type: 'tick';
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

self.onmessage = (e: MessageEvent<TickMessage>) => {
  const { buffer, width, height } = e.data;
  const cells = new Uint8Array(buffer);
  const next = step({ width, height, cells });
  self.postMessage(
    { type: 'grid', buffer: next.cells.buffer, width: next.width, height: next.height },
    [next.cells.buffer],
  );
};
