import React, { Component } from "react";
import { widget } from "../charting_library";
import Datafeed from "./datafeed";

export default class TVChartContainer extends Component {

  constructor(props) {
    super(props);

    this.ref = React.createRef();
    this.tvWidget = null;
  }

  componentDidMount() {
    const widgetOptions = {
      symbol: this.props.symbol,
      // BEWARE: no trailing slash is expected in feed URL
      datafeed: Datafeed,
      interval: this.props.interval,
      container: this.ref.current,
      library_path: "./lib/charting_library",
      locale: "en",
      // disabled_features: ["use_localstorage_for_settings"],
      // enabled_features: ["study_templates"],
      // charts_storage_url: this.props.chartsStorageUrl,
      // charts_storage_api_version: this.props.chartsStorageApiVersion,
      // client_id: "tradingview.com",
      // user_id: "public_user_id",
      fullscreen: false,
      autosize: true,
      studies_overrides: {},
    };

    const tvWidget = new widget(widgetOptions);
    this.tvWidget = tvWidget;

    tvWidget.onChartReady(() => {
      const takeProfit = tvWidget.chart()
        .createOrderLine()
        .setText("Take profit")
        .setLineLength(3)
        .setLineStyle(1)
        .setLineColor("green")
        .setBodyBorderColor("green")
        .setBodyTextColor("green")
        .setQuantityBackgroundColor("green")
        .setQuantityBorderColor("green")
        .setQuantityTextColor("green")
        .setQuantity("225 USDT");
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
    return <div ref={this.ref} style={{ height: "calc(100vh - 80px)" }} />;
  }
}
