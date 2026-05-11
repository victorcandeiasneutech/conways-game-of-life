import { Test } from '@nestjs/testing';
import { PatternsController } from './patterns.controller';
import { PatternsService } from './patterns.service';
import { NotFoundException } from '@nestjs/common';

const mockService = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
};

describe('PatternsController', () => {
  let controller: PatternsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PatternsController],
      providers: [{ provide: PatternsService, useValue: mockService }],
    }).compile();
    controller = module.get(PatternsController);
    jest.clearAllMocks();
  });

  it('list() delegates to service', async () => {
    mockService.list.mockResolvedValue([]);
    expect(await controller.list()).toEqual([]);
  });

  it('get() returns pattern for valid id', async () => {
    const p = { id: '1', name: 'blinker', width: 5, height: 5, liveCells: [], createdAt: '' };
    mockService.get.mockResolvedValue(p);
    expect(await controller.get('1')).toEqual(p);
  });

  it('get() propagates NotFoundException', async () => {
    mockService.get.mockRejectedValue(new NotFoundException());
    await expect(controller.get('missing')).rejects.toThrow(NotFoundException);
  });

  it('create() returns saved pattern', async () => {
    const dto = { name: 'blinker', width: 5, height: 5, liveCells: [[1,2],[2,2],[3,2]] as [number,number][] };
    const saved = { ...dto, id: 'uuid', createdAt: '2026-01-01T00:00:00.000Z' };
    mockService.create.mockResolvedValue(saved);
    expect(await controller.create(dto)).toEqual(saved);
  });
});
