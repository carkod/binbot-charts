import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('../src/charting_library', async () => {
  // Use the mock from __mocks__
  return await import('./__mocks__/charting_library.js');
});
import { render, screen } from '@testing-library/react';
import TVChartContainer from '../src/main';

// Mock ResizeObserver for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TVChartContainer', () => {
  it('renders without crashing', () => {
    render(
      <TVChartContainer symbol="SUPERUSDT" exchange="binance" />
    );
    // The chart container should be in the document
    expect(document.querySelector('div')).toBeTruthy();
  });

  it('renders with KuCoin symbol', () => {
    render(
      <TVChartContainer symbol="SUPER-USDT" exchange="kucoin" />
    );
    expect(document.querySelector('div')).toBeTruthy();
  });
});
