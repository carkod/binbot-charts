import React, { Component } from "react";
import "./App.css";
import TVChartContainer from "./components/TVChartContainer";

class App extends Component {
  render() {
    return (
      <>
        Test chart
        <TVChartContainer
          symbol="Binance:APE/USDT"
          interval="15m"
        />
      </>
    );
  }
}

export default App;
