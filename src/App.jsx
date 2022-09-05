import React, { Component } from "react";
import "./App.css";
import TVChartContainer from "./components/TVChartContainer";

const testTimeMarks = [{
  id: "tsm4",
  time: 1662301800,
  color: "red",
  label: "B", 
  tooltip: ["Safety Order 4"],
}]

const testOrderLines = [{
  text: "Take profit 10%",
  tooltip: ["Additional position information"],
  quantity: "200 USDT",
  price: 4.85,
  color: "green",
}]
class App extends Component {
  render() {
    return (
      <>
        <h1 style={{textAlign: "center"}}>Test chart</h1>
        <TVChartContainer
          symbol="Binance:APE/USDT"
          interval="1D"
          timescaleMarks={testTimeMarks}
          orderLines={testOrderLines}
          apiKey={"008b268768709f1e8c3ffbd98aea37e61b6e0c540cec971b5948bed7ea564893"}
        />
      </>
    );
  }
}

export default App;
