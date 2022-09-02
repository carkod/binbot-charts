Binbot charts is default candlestick bars chart used in terminal.binbot.com to render bots graphically, packaged to be used in React.
Import it in your project as a React component

`import TVChartContainer from 'binbot-charts'`


## How to start

1. Run `yarn install && yarn start`. It will build the project and open a default browser with the Charting Library.
2. `library_path` should be `node_modules/dist/charting_library`
3. Write a script to copy `charting_library` to `public/charting_library` during build. E.g. `cp -r node_modules/dist/charting_library/ src/public/charting_library`

## About This Project

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

## Notes
The earliest supported version of the charting library for these examples is `v20`.
