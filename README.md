Binbot charts is default candlestick bars chart used in terminal.binbot.com to render bots graphically, packaged to be used in React.
Import it in your project as a React component

`import TVChartContainer from 'binbot-charts'`


## Multi-Exchange Support

This library now supports multiple cryptocurrency exchanges. You can configure which exchange to use and which exchanges to make available for symbol search.

### Supported Exchanges
- **Binance** - Default exchange
- **KuCoin** - Added in v0.7.3+

### Usage Example

```jsx
import TVChartContainer, { SUPPORTED_EXCHANGES } from 'binbot-charts';

function MyChart() {
  return (
    <TVChartContainer
      symbol="BTCUSDT"
      interval="1h"
      exchange="binance"  // or "kucoin"
      supportedExchanges={["binance", "kucoin"]}
    />
  );
}
```

### Props

- `exchange` (optional, default: `"binance"`): The exchange to use for fetching data. Options: `"binance"`, `"kucoin"`
- `supportedExchanges` (optional, default: `["binance", "kucoin"]`): Array of exchanges to include in symbol search
- `symbol` (optional, default: `"BTCUSDT"`): Trading pair symbol
- `interval` (optional, default: `"1h"`): Chart interval/timeframe
- `timescaleMarks` (optional): Array of custom marks to display on the timeline
- `orderLines` (optional): Array of order lines to display on the chart
- `onTick` (optional): Callback function for real-time tick updates
- `getLatestBar` (optional): Callback function to get the latest bar data

### Exchange Configuration

You can also import and use the exchange configurations directly:

```jsx
import { SUPPORTED_EXCHANGES, ExchangeConfig } from 'binbot-charts';

// Access exchange configuration
const binanceConfig = SUPPORTED_EXCHANGES.binance;
console.log(binanceConfig.restApiUrl); // "https://api.binance.com"
```


## How to start

1. Run `npm install && npm start`. It will build the project and open a default browser with the Charting Library.
2. `library_path` should be `node_modules/dist/charting_library`
3. Write a script to copy `charting_library` to `public/charting_library` during build. E.g. `cp -r node_modules/dist/charting_library/ src/public/charting_library`

## About This Project

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

## Notes
The earliest supported version of Node of the charting library for these examples is `v20`.
