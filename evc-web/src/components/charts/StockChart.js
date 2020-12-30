import React, { useRef } from 'react';
import { Area, Stock, DualAxes } from '@ant-design/charts';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { getStockChart } from 'services/stockService';
import * as _ from 'lodash';
import * as moment from 'moment';
import {Button, Space} from 'antd';

const StockChart = props => {
  const { symbol, type: propPeriod } = props;
  const [period, setPeriod] = React.useState(propPeriod);
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const periods = [
    '1h',
    '4h',
    '1d',
    '5d',
    '1m',
    '1y'
  ]

  const getTime = item => {
    const {date, minute} = item;
    return minute ? `${date} ${minute}`: date;
  }

  const formatTimeForRawData = (data) => {
    const minuteOnly = ['1h', '4h', '1d'].includes(period);
   const formatted =  (data ?? []).filter(x => x.average !== null).map((x, i) => ({
      price: x.average || x.close,
      time: minuteOnly ? x.minute : getTime(x),
      volume: x.volume,
    }));
    return formatted;
  }

  const loadData = async (period) => {
    try {
      setLoading(true);
      const rawData = await getStockChart(symbol, period);
      setData(formatTimeForRawData(rawData));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData(propPeriod);
  }, [propPeriod]);

  const handleChangePeriod = async p => {
    if(p !== period) {
      loadData(p);
      setPeriod(p);
    }
  }

  const config = {
    // width: 400,
    // height: 500,
    legend: false,
    enterable: true,
    data: data,
    // tooltip: {
    //   customContent: (title, items) => {
    //     const item = items[0];
    //     if(!item) return null;
    //     return <div>
    //       {item.data.minute}
    //     </div>
    //   },
    // },
    height: 200,
    xField: 'time',
    yField: 'price',
    // areaStyle: {
    //   fill: 'l(270) 0:#ffffff 0.5:#15be53 1:#15be53',
    //   fillOpacity: 0.7,
    // },
    // line: { color: '#15be53' },
    yAxis: {
      min: _.min(data.map(x => x.price)),
      max: _.max(data.map(x => x.price)),
    },
    // xAxis: {
    //   tickInterval: 30
    // }
  };

  const configDual = {
    data: [data, data],
    xField: 'time',
    yField: ['price', 'volume'],
    geometryOptions: [
      {
        geometry: 'line',
        color: '#3273A4',
        lineStyle: {
          lineWidth: 1,
        }
      },
      {
        geometry: 'column',
        color: '#fa8c16',
        // color: (_ref, x, y, z) => {
        //   const value = _ref.price;
        //   return value > 1800 ? '#f4664a' : '#30bf78';
        // }
      },
    ]
  }

  return <>
    <Space style={{justifyContent: 'flex-end', width: '100%'}}>
      {periods.map(p => <Button type="link" key={p} onClick={() => handleChangePeriod(p)} disabled={p === period}>{p}</Button>)}
      
      </Space>
    {/* <Area {...config}/> */}
    <DualAxes {...configDual} />
  </>
}

StockChart.propTypes = {
  symbol: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired
};

StockChart.defaultProps = {
  type: '1d'
};

export default StockChart;