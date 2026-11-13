export const chartState = {
  shapes: new Map(),
  removed: [],
  nextId: 1,
  events: new Map(),
  shortcuts: new Map(),
  refreshes: 0,
};
export const emit = (event, ...args) => chartState.events.get(event)?.(...args);
const chart = {
  exportData: () => Promise.resolve({ data: [] }),
  createShape: (point, options) => {
    const id = chartState.nextId++;
    chartState.shapes.set(id, { ...options, points: [point] });
    return Promise.resolve(id);
  },
  getShapeById: (id) => ({
    getPoints: () => chartState.shapes.get(id).points,
    setPoints: (points) => {
      chartState.shapes.get(id).points = points;
      emit("drawing_event", id, "points_changed");
    },
    setProperties: (props) =>
      Object.assign(chartState.shapes.get(id).overrides, props),
    setSelectionEnabled: (enabled) => {
      chartState.shapes.get(id).disableSelection = !enabled;
    },
    setUserEditEnabled: (enabled) => {
      chartState.shapes.get(id).lock = !enabled;
    },
  }),
  refreshMarks: () => {
    chartState.refreshes++;
  },
  removeEntity: (id) => {
    chartState.removed.push(id);
    chartState.shapes.delete(id);
  },
};
export class widget {
  constructor(options) {
    this._options = options || {};
  }
  onChartReady(cb) {
    cb();
  }
  subscribe(event, callback) {
    chartState.events.set(event, callback);
  }
  unsubscribe(event) {
    chartState.events.delete(event);
  }
  onShortcut(key, callback) {
    chartState.shortcuts.set(key, callback);
  }
  setSymbol() {}
  remove() {
    chartState.events.clear();
  }
  activeChart() {
    return chart;
  }
}
