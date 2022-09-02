"use strict";

require("core-js/modules/web.dom-collections.iterator.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(require("react"));

var _charting_library = require("../charting_library");

var _datafeed = _interopRequireDefault(require("./datafeed"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class TVChartContainer extends _react.Component {
  constructor(props) {
    super(props);

    _defineProperty(this, "tvWidget", null);

    this.ref = /*#__PURE__*/_react.default.createRef();
  }

  componentDidMount() {
    const widgetOptions = {
      symbol: "AAPL",
      // BEWARE: no trailing slash is expected in feed URL
      datafeed: _datafeed.default,
      // interval: this.props.interval,
      container: this.ref.current,
      library_path: this.props.libraryPath,
      locale: "en",
      // disabled_features: ["use_localstorage_for_settings"],
      // enabled_features: ["study_templates"],
      // charts_storage_url: this.props.chartsStorageUrl,
      // charts_storage_api_version: this.props.chartsStorageApiVersion,
      // client_id: this.props.clientId,
      // user_id: this.props.userId,
      fullscreen: false,
      autosize: false,
      studies_overrides: {}
    };
    const tvWidget = new _charting_library.widget(widgetOptions);
    this.tvWidget = tvWidget;
    tvWidget.onChartReady(() => {
      const takeProfit = tvWidget.chart().createOrderLine().setText("Take profit").setLineLength(3).setLineStyle(1).setLineColor("green").setBodyBorderColor("green").setBodyTextColor("green").setQuantityBackgroundColor("green").setQuantityBorderColor("green").setQuantityTextColor("green").setQuantity("225 USDT");
      takeProfit.setPrice(182);
    });
  }

  componentWillUnmount() {
    if (this.tvWidget !== null) {
      this.tvWidget.remove();
      this.tvWidget = null;
    }
  }

  render() {
    return /*#__PURE__*/_react.default.createElement("div", {
      ref: this.ref,
      style: {
        height: "calc(100vh - 80px)"
      }
    });
  }

}

exports.default = TVChartContainer;