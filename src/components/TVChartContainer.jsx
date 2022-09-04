import React, { PureComponent } from "react";
import { widget } from "../charting_library";
import Datafeed from "./datafeed";

export default class TVChartContainer extends PureComponent {
  static defaultProps = {
    symbol: "AAPL",
    interval: "D",
    datafeedUrl: "https://demo_feed.tradingview.com",
    libraryPath: "/charting_library/",
    chartsStorageUrl: "https://saveload.tradingview.com",
    chartsStorageApiVersion: "1.1",
    clientId: "tradingview.com",
    userId: "public_user_id",
    fullscreen: false,
    autosize: true,
    studiesOverrides: {},
  };

  tvWidget = null;

  constructor(props) {
    super(props);

    this.ref = React.createRef();
  }

  componentDidMount() {
    const widgetOptions = {
      symbol: this.props.symbol,
      // BEWARE: no trailing slash is expected in feed URL
      datafeed: new Datafeed(this.props.timescaleMarks),
      interval: this.props.interval,
      container: this.ref.current,
      library_path: this.props.libraryPath,
      locale: "en",
      fullscreen: this.props.fullscreen,
      autosize: this.props.autosize,
      studies_overrides: this.props.studiesOverrides,
    };

    const tvWidget = new widget(widgetOptions);
    this.tvWidget = tvWidget;

    tvWidget.onChartReady(() => {
      this.props.orderLines.forEach(element => {
        tvWidget.chart().createPositionLine()
        .setText(element.text)
        .setTooltip(element.tooltip)
        // .setProtectTooltip("Protect position")
        // .setCloseTooltip("Close position")
        // .setReverseTooltip("Reverse position")
        .setQuantity(element.quantity)
        .setQuantityBackgroundColor(element.color)
        .setQuantityBorderColor(element.color)
        // .setExtendLeft(false)
        .setLineStyle(0)
        .setLineLength(25)
        .setLineColor(element.color)
        .setBodyBackgroundColor(element.color)
        .setBodyBorderColor(element.color)
        .setBodyTextColor(element.color)
        .setPrice(element.price)
      });
      
    })

  }

  componentWillUnmount() {
    if (this.tvWidget !== null) {
      this.tvWidget.remove();
      this.tvWidget = null;
    }
  }

  render() {
    return <div ref={this.ref} style={{ height: "calc(100vh - 80px)" }} />;
  }
}
