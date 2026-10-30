// Minimal mock for TradingView charting library
export const chartState = {
  shapes: new Map(),
  removed: [],
  nextId: 1,
};

const chart = {
  exportData: () => Promise.resolve({ data: [] }),
  createShape: (_point, options) => {
    const id = chartState.nextId++;
    chartState.shapes.set(id, options);
    return Promise.resolve(id);
  },
  getShapeById: () => ({
    setPoints: () => {},
    setProperties: () => {},
  }),
  removeEntity: (id) => {
    chartState.removed.push(id);
    chartState.shapes.delete(id);
  },
};

export class widget {
  constructor(options) {
    this._options = options || {};
  }
  onChartReady(cb) { cb(); }
  subscribe() {}
  setSymbol() {}
  remove() {}
  activeChart() {
    return chart;
  }
  chart() {
    return {
      createOrderLine: () => ({
        setText: function() { return this; },
        setTooltip: function() { return this; },
        setQuantity: function() { return this; },
        setQuantityFont: function() { return this; },
        setQuantityBackgroundColor: function() { return this; },
        setQuantityBorderColor: function() { return this; },
        setLineStyle: function() { return this; },
        setLineLength: function() { return this; },
        setLineColor: function() { return this; },
        setBodyFont: function() { return this; },
        setBodyBorderColor: function() { return this; },
        setBodyTextColor: function() { return this; },
        setPrice: function() { return this; },
      })
    };
  }
}
