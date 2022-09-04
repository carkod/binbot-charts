import React, { Component } from "react";
import "./App.css";
import TVChartContainer from "./components/TVChartContainer";

const testTimeMarks = [{
  id: "tsm4",
  time: 1652572800,
  color: "red",
  label: "B",
  tooltip: ["Safety Order 4"],
}]

const testOrderLines = [{
  text: "Take profit order: 10",
  tooltip: ["Additional position information"],
  quantity: "200 USDT",
  price: 5.5,
  color: "green",
}]
class App extends Component {
  render() {
    return (
      <>
        <h1 style={{textAlign: "center"}}>Test chart</h1>
        <TVChartContainer
          symbol="Binance:APE/USDT"
          interval="1H"
          timescaleMarks={testTimeMarks}
          orderLines={testOrderLines}
        />
      </>
    );
  }
}

export default App;
