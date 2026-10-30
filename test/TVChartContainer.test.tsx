import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('../src/charting_library', async () => {
  // Use the mock from __mocks__
  return await import('./__mocks__/charting_library.js');
});
import { render, waitFor } from '@testing-library/react';
import TVChartContainer from '../src/main';
import { chartState } from './__mocks__/charting_library.js';

// Mock ResizeObserver for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TVChartContainer', () => {
  beforeEach(() => {
    chartState.shapes.clear();
    chartState.removed.length = 0;
    chartState.nextId = 1;
  });

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

  it('removes order lines when they disappear from the props', async () => {
    const { rerender } = render(
      <TVChartContainer
        symbol="SUPER-USDT"
        exchange="kucoin"
        orderLines={[{ id: 'stop_loss', text: 'Stop loss', price: 90, color: 'red' }]}
      />
    );
    await waitFor(() => expect(chartState.shapes.size).toBe(1));

    rerender(<TVChartContainer symbol="SUPER-USDT" exchange="kucoin" orderLines={[]} />);

    await waitFor(() => expect(chartState.shapes.size).toBe(0));
    expect(chartState.removed).toEqual([1]);
  });
});
