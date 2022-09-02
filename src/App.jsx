import React, { Component } from "react";
import "./App.css";
import TVChartContainer from "./lib/components/TVChartContainer";

class App extends Component {
  render() {
    return (
      <>
        Test chart
        <TVChartContainer
          symbol="AAPL"
          interval="D"
        />
      </>
    );
  }
}

export default App;
