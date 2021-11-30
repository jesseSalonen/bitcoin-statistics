import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import './index.css';

// Renders the upper box for user input
class DefaultPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            minDate: new Date('2013-04-28'),
            maxDate: new Date(),
            startDate: '',
            endDate: '',
            showStatistics: false
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    // Save date input changes in component state, causing a re-render for whole page
    handleChange = (event) => {
        if (event.target.name === 'start_date') {
            this.setState({
                startDate: event.target.value,
                showStatistics: false
            })
        } else {
            this.setState({
                endDate: event.target.value,
                showStatistics: false
            })
        }
    }

    // Re-render the whole page when user submits the dates, this time with the statistics
    handleSubmit = (event) => {
        event.preventDefault();
        this.setState({
            showStatistics: true
        })
    }

    // Render the upper box with user input fields, handle the date restrictions for start and end dates
    render() {
        var day = 60 * 60 * 24 * 1000;
        let updatedEndDate, updatedStartDate;
        if (this.state.startDate) {
            updatedStartDate = new Date(this.state.startDate);
            updatedStartDate = new Date(updatedStartDate.getTime() + day).toISOString().split("T")[0];
        }
        if (this.state.endDate) {
            updatedEndDate = new Date(this.state.endDate);
            updatedEndDate = new Date(updatedEndDate.getTime() - day).toISOString().split("T")[0];
        }
        return (
            <>
                <h1>Bitcoin statistics</h1>
                <form className="box" onSubmit={this.handleSubmit}>
                    <label className="box_startDate">
                        Start date
                        <input
                            type="date"
                            name="start_date"
                            value={this.state.startDate}
                            required
                            onChange={this.handleChange}
                            min={this.state.minDate.toISOString().split("T")[0]}
                            max={updatedEndDate || new Date(this.state.maxDate.getTime() - day).toISOString().split("T")[0]}
                        />
                    </label>
                    <label className="box_endDate">
                        End date
                        <input
                            type="date"
                            name="end_date"
                            value={this.state.endDate}
                            required
                            onChange={this.handleChange}
                            min={updatedStartDate || new Date(this.state.minDate.getTime() + day).toISOString().split("T")[0]}
                            max={this.state.maxDate.toISOString().split("T")[0]}
                        />
                    </label>
                    <br/>
                    <input className="box_submit" type="submit" value="Submit"/>
                </form>
                {this.state.showStatistics ?
                    <StatisticsElement
                        startDate={this.state.startDate}
                        endDate={this.state.endDate}
                    /> :
                    null
                }
            </>
        );
    }
}

// Renders the lower box for statistics
class StatisticsElement extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startDate: parseInt((new Date(this.props.startDate).getTime() / 1000).toFixed(0)),
            endDate: parseInt((new Date(this.props.endDate).getTime() / 1000).toFixed(0)) + 3600,
            filtered_prices: [],
            filtered_volumes: [],
            dataFetched: false
        }
    }

    // After initial render, fetch data for give date range.
    // Filter out everything else but midnights (UTC)
    // Save filtered data to component states
    componentDidMount() {
        axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&' +
            'from=' + this.state.startDate +
            '&' +
            'to=' + this.state.endDate
        )
        .then(res => {
            debugger;
            let prices = res.data.prices;
            let total_volumes = res.data.total_volumes;
            let filtered_prices = [];
            let filtered_volumes = [];

            prices.forEach(price => {
                price[0] = parseInt(price[0] / 60000).toFixed();
            });
            total_volumes.forEach(volume => {
                volume[0] = parseInt(volume[0] / 60000).toFixed();
            });

            const startDate = parseInt((this.state.startDate / 60).toFixed());
            const endDate = parseInt((this.state.endDate / 60).toFixed());

            let diff;
            let closestToMidnight = 0;
            for (let i = startDate; i <= endDate; i += 1440) {
                for (let j = closestToMidnight; j < prices.length; j++) {
                    diff = Math.abs(prices[j][0] - i);
                    if (diff <= Math.abs(prices[closestToMidnight][0] - i)) {
                        closestToMidnight = j;
                    } else break;
                }
                filtered_prices.push(prices[closestToMidnight]);
            }
            closestToMidnight = 0;
            for (let i = startDate; i <= endDate; i += 1440) {
                for (let j = closestToMidnight; j < total_volumes.length; j++) {
                    diff = Math.abs(total_volumes[j][0] - i);
                    if (diff <= Math.abs(total_volumes[closestToMidnight][0] - i)) {
                        closestToMidnight = j;
                    } else break;
                }
                filtered_volumes.push(total_volumes[closestToMidnight]);
            }
            
            this.setState({
                filtered_prices: filtered_prices,
                filtered_volumes: filtered_volumes,
                dataFetched: true
            })

        })
    }

    // Render a box surrounding the calculated statistics
    // Call components for statistics when data has been fetched
    render() {
        return (
            <div className="lower_box">
                <div>
                    <h1>
                        Statistics
                    </h1>
                </div>
                {this.state.dataFetched ?
                    <div className="statistics">
                    <DownwardStreak prices={this.state.filtered_prices} />
                    <HighestVolume volumes={this.state.filtered_volumes} />
                    <TimeMachine prices={this.state.filtered_prices} />
                    </div> :
                    null
                }
            </div>
        );
    }
}

// Calculates and renders the longest downward streak in value
class DownwardStreak extends React.Component {
    render() {
        const prices = this.props.prices;
        let prev, count, highestCount;
        prices.forEach(price => {
            if (prev == null) {
                prev = price[1];
                count = 1;
                highestCount = 1;
            } else if (price[1] < prev) {
                prev = price[1];
                count++;
            } else {
                if (count > highestCount) highestCount = count;
                prev = price[1];
                count = 1;
            }
        });
        if (count > highestCount) highestCount = count;
        
        return (
            <div className="statistics_box">
                <h2>Longest downward streak in value:</h2>
                <p>{highestCount}</p>
            </div>
        );
    }
}

// Calculates and renders the date with the highest volume
class HighestVolume extends React.Component {
    render() {
        const volumes = this.props.volumes;
        let date, value;
        volumes.forEach(volume => {
            if (value == null && volume[1] !== 0) {
                value = volume[1];
                date = volume[0];
            } else if (volume[1] > value && value != null) {
                value = volume[1];
                date = volume[0];
            }
        });
        const UTCString = new Date(date * 60000).toLocaleDateString('fi-FI');
        return (
            <div className="statistics_box">
                <h2>Day with the highest volume:</h2>
                <p>{UTCString}</p>
                <h2>Volume:</h2>
                <p>{value}</p>
            </div>
        );
    }
}

// Calculates and calls suitable components for rendering best days to buy and sell
class TimeMachine extends React.Component {
    render() {
        let highestUTCString;
        let lowestUTCString;
        const prices = this.props.prices;
        let lowestDate, highestDate;
        let onlyDownward = false;
        let maxDiff = prices[1][1] - prices[0][1];
        if (maxDiff > 0) {
            lowestDate = prices[0][0];
            highestDate = prices[1][0];
        }
        for (let i = 0; i < prices.length; i++) {
            for (let j = i+1; j < prices.length; j++) {
                if (prices[j][1] - prices[i][1] > maxDiff) {
                    maxDiff = prices[j][1] - prices[i][1];
                    lowestDate = prices[i][0];
                    highestDate = prices[j][0];
                }
            }
        }
        if (maxDiff > 0) {
            highestUTCString = new Date(highestDate * 60000).toLocaleDateString('fi-FI');
            lowestUTCString = new Date(lowestDate * 60000).toLocaleDateString('fi-FI');
        } else onlyDownward = true;

        return (
                <div className="statistics_box">
                {onlyDownward ?
                    <OnlyDownward/> :
                    <BuySell
                        buy={lowestUTCString}
                        sell={highestUTCString}
                    />
                }
                </div>
        );
    }
}

// If price has increased in given date range, input days to buy and sell
function BuySell(props) {
    return (
        <div>
            <h2>When to buy/sell</h2>
            <h3>Buy:</h3>
            <p>{props.buy}</p>
            <h3>Sell:</h3>
            <p>{props.sell}</p>
        </div>
    );
}

// If price has only decreased in given date range, input message
function OnlyDownward(props) {
    return (
        <div>
            <h2>When to buy/sell</h2>
            <p>Value only decreasing, no suitable dates</p>
        </div>
    );
}

  // ========================================
  
ReactDOM.render(
    <DefaultPage />,
    document.getElementById('root')
);