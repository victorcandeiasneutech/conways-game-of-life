export interface NamedPattern {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly liveCells: ReadonlyArray<readonly [number, number]>;
}
