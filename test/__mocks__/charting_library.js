// Minimal mock for TradingView charting library
export const widget = () => ({
  onChartReady: () => {},
  subscribe: () => {},
  setSymbol: () => {},
  remove: () => {},
  activeChart: () => ({
    exportData: () => ({ data: [] })
  }),
  chart: () => ({
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
  })
});
