import * as React from "react";
import { widget } from "../charting_library";
import Datafeed from "./datafeed";

export default class TVChartContainer extends React.PureComponent {
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
      datafeed: Datafeed,
      interval: this.props.interval,
      container: this.ref.current,
      library_path: this.props.libraryPath,
      locale: "en",
      disabled_features: ["use_localstorage_for_settings"],
      enabled_features: ["study_templates"],
      charts_storage_url: this.props.chartsStorageUrl,
      charts_storage_api_version: this.props.chartsStorageApiVersion,
      client_id: this.props.clientId,
      user_id: this.props.userId,
      fullscreen: this.props.fullscreen,
      autosize: this.props.autosize,
      studies_overrides: this.props.studiesOverrides,
    };

    const tvWidget = new widget(widgetOptions);
    this.tvWidget = tvWidget;

    // tvWidget.onChartReady(() => {
    //   tvWidget.headerReady().then(() => {
    //     const button = tvWidget.createButton();
    //     button.setAttribute("title", "Click to show a notification popup");
    //     button.classList.add("apply-common-tooltip");
    //     button.addEventListener("click", () =>
    //       tvWidget.showNoticeDialog({
    //         title: "Notification",
    //         body: "TradingView Charting Library API works correctly",
    //         callback: () => {
    //           console.log("Noticed!");
    //         },
    //       })
    //     );

    //     button.innerHTML = "Check API";
    //   });
    // });
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
