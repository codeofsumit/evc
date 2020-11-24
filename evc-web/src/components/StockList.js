import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Button, Input, Layout, Modal, Select, Space, Table, Card, Typography } from 'antd';
import { TimeAgo } from 'components/TimeAgo';
import { countUnreadMessage } from 'services/messageService';
import { GlobalContext } from 'contexts/GlobalContext';
import { withRouter } from 'react-router-dom';
import { Loading } from './Loading';
import Highlighter from "react-highlight-words";
import { Link } from 'react-router-dom';
import { DeleteOutlined, EditOutlined, SearchOutlined, SyncOutlined, PlusOutlined, MessageOutlined } from '@ant-design/icons';
import { List } from 'antd';
import { StockName } from './StockName';

const { Text, Title, Paragraph } = Typography;

const StyledListItem = styled.div`
display: flex;
width: 100%;
justify-content: space-between;
margin: 0;
padding: 0.5rem 0.1rem 0.5rem 0;
border-bottom: 1px solid #f3f3f3;
align-items: flex-start;
cursor: pointer;

&:hover {
  background-color: rgba(0,0,0,0.03);
}

.ant-typography {
  margin-bottom: 2px;
}

`;

const StockList = (props) => {

  const { data, search, loading: propLoading } = props;

  const [list, setList] = React.useState(data);
  const [loading, setLoading] = React.useState(propLoading);
  const [text, setText] = React.useState(search);


  React.useEffect(() => {
    setList(data);
    setText(search);
    setLoading(setLoading);
  }, [data, search, propLoading]);

  const columnDef = [
    {
      title: 'Stock',
      // onFilter: (value, record) => record.name.includes(value),
      render: (value, item) => <>
        <Highlighter highlightClassName="search-highlighting" searchWords={[text]} autoEscape={false} textToHighlight={item.symbol} /><br/>
        <Text type="secondary"><small><Highlighter highlightClassName="search-highlighting" searchWords={[text]} autoEscape={false} textToHighlight={item.company} /></small></Text>
      </>,
    },
    {
      title: 'PE',
      render: (text, item) => <>{item.peLo} - {item.peHi}</>
    },
    {
      title: 'Value',
      render: (text, item) => <>{item.value}</>
    },
    {
      title: 'Support',
      render: (text, item) => <>{item.supportPriceLo} - {item.supportPriceHi}</>
    },
    {
      title: 'Pressure',
      render: (text, item) => <>{item.pressurePriceLo} - {item.pressurePriceHi}</>
    },
    {
      title: 'Last Updated',
      dataIndex: 'createdAt',
      render: (text) => {
        return <TimeAgo value={text} accurate={false}/>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'publised',
      render: (value) => {
        return value ? 'Published' : 'Saved'
      }
    },
    // {
    //   title: 'Action',
    //   render: (text, record) => (
    //     <Space size="small">
    //       <Tooltip placement="bottom" title="Proceed task">
    //         <Link to={`/tasks/${record.id}/proceed`}><Button shape="circle" icon={<EditOutlined />}></Button></Link>
    //       </Tooltip>
    //       <Tooltip placement="bottom" title="Delete task">
    //         <Button shape="circle" danger onClick={e => handleDelete(e, record)} icon={<DeleteOutlined />}></Button>
    //       </Tooltip>
    //     </Space>
    //   ),
    // },
  ];

  return (
    <List
    grid={{
      gutter: 10,
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 6,
      xxl: 6,
    }}
    size="small"
    dataSource={list}
    renderItem={stock => (
      <List.Item>
        <Card 
        size="small" 
        type="inner"
        // bordered={false}
        hoverable={true}
        onClick={() => props.history.push(`/stock/${stock.symbol}`)}
        title={<StockName value={stock}/>}
        >
          Card content
          </Card>
      </List.Item>
    )}
    />

  )
  return (
      <Table
        columns={columnDef}
        dataSource={list}
        // scroll={{x: 1000}}
        rowKey="symbol"
        size="small"
        loading={loading}
        pagination={false}
        // onChange={handleTableChange}
        // rowClassName={(record) => record.lastUnreadMessageAt ? 'unread' : ''}
        onRow={(item) => ({
          onDoubleClick: () => {
            props.history.push(`stock/${item.symbol}`);
          }
        })}
      />
  );
};

StockList.propTypes = {
  data: PropTypes.array.isRequired,
  search: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
};

StockList.defaultProps = {
  search: '',
  loading: false
};

export default withRouter(StockList);
