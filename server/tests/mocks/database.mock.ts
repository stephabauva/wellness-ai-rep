import { vi } from 'vitest';

const mockExecute = vi.fn().mockResolvedValue([]);

const mockPrepare = vi.fn(() => ({
  execute: mockExecute,
}));

const mockOrderBy = vi.fn(() => ({
  prepare: mockPrepare,
  execute: mockExecute,
}));

export const createTestDatabaseMock = () => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        prepare: mockPrepare,
        execute: mockExecute,
        all: vi.fn(() => []),
        orderBy: mockOrderBy,
      })),
      prepare: mockPrepare,
      execute: mockExecute,
      all: vi.fn(() => []),
    })),
  })),
  execute: mockExecute,
  transaction: vi.fn(async (callback) => await callback({})),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([]),
    })),
  })),
});

export const mockDb = createTestDatabaseMock();
export const mockPool = {
  end: vi.fn(),
  query: vi.fn(() => Promise.resolve({ rows: [{ count: '10' }] }))
};
