
import React from 'react';
import { List, Typography, Space, Alert, Table, Form, Input, Button } from 'antd';
import * as moment from 'moment';
import PropTypes from 'prop-types';
import { PushpinFilled, PushpinOutlined, EllipsisOutlined, DeleteOutlined, FlagFilled, FlagOutlined } from '@ant-design/icons';
import * as _ from 'lodash';
import { NumberRangeInput } from 'components/NumberRangeInput';
import { NumberRangeDisplay } from 'components/NumberRangeDisplay';
import { AiTwotonePushpin } from 'react-icons/ai';
import styled from 'styled-components';
import { Switch } from 'antd';
import { Tag } from 'antd';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { TimeAgo } from 'components/TimeAgo';

const EditableContext = React.createContext(null);

const { Text } = Typography;

const Container = styled.div`
  .current-published {
    background-color: rgba(21,190,83, 0.1);
  }

  .editable-cell {
    position: relative;
  }
  
  .editable-cell-value-wrap {
    padding: 5px 12px;
    cursor: pointer;
  }
  
  .editable-row:hover .editable-cell-value-wrap {
    padding: 4px 11px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
  }
  
  [data-theme='dark'] .editable-row:hover .editable-cell-value-wrap {
    border: 1px solid #434343;
  }
`;

const EditableRow = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

const EditableCell = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef(null);
  const form = React.useContext(EditableContext);
  React.useEffect(() => {
    if (editing) {
      inputRef.current.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({
      [dataIndex]: record[dataIndex],
    });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      toggleEdit();
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{
          margin: 0,
        }}
        name={dataIndex}
        rules={[
          {
            required: true,
            message: `${title} is required.`,
          },
        ]}
      >
        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
      </Form.Item>
    ) : (
        <div
          className="editable-cell-value-wrap"
          style={{
            paddingRight: 24,
          }}
          onClick={toggleEdit}
        >
          {children}
        </div>
      );
  }

  return <td {...restProps}>{childNode}</td>;
};

export const StockFairValueTimelineEditor = (props) => {
  const { onLoadList, onSaveNew, onChange, onDelete, onSelected, getClassNameOnSelect, showTime, sourceEps, sourcePe } = props;
  const [disabled, setDisabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [list, setList] = React.useState([]);
  const [isSpecialFairValue, setIsSpecialFairValue] = React.useState(false);
  const [derivedValue, setDerivedValue] = React.useState({ lo: null, hi: null });

  const updateList = list => {
    setList(list);
    onChange(list);
  }

  const loadEntity = async () => {
    try {
      setLoading(true);
      updateList(await onLoadList());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadEntity();
  }, []);


  // const handleSave = async (range) => {
  //   try {
  //     setLoading(true);
  //     await onSaveNew({
  //       lo: range[0],
  //       hi: range[1],
  //     });
  //     setIsSpecialFairValue(false);
  //     updateList(await onLoadList());
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  const handleDeleteSpecialFairValue = async (specialFairValueId) => {
    try {
      setLoading(true);
      await onDelete(specialFairValueId);
      updateList(await onLoadList());
    } finally {
      setLoading(false);
    }
  }

  const displayNumber = value => {
    return _.isNil(value) ? <Text type="danger"><small>n/a</small></Text> : (+value).toFixed(2);
  }

  const handleSaveCell = (row) => {
    const newData = [...list];
    const index = newData.findIndex((item) => row.date === item.date);
    const item = newData[index];
    newData.splice(index, 1, { ...item, ...row });
    setList(newData);
  };

  const columnDef = [
    {
      title: 'Date',
      dataIndex: 'date',
      render: (value) => <TimeAgo value={value} showTime={false} showAgo={false} direction="horizontal" />
    },
    {
      title: 'PE',
      render: (value, item) => {
        const {pe, peLo, peHi} = item;
        return pe ? <>{displayNumber(pe)} ({displayNumber(peLo)} ~ {displayNumber(peHi)})</> : displayNumber()
      },
    },
    {
      title: 'Fair Value',
      render: (value, item) => {
        const {fairValueLo, fairValueHi} = item;
        return fairValueLo ? <>{displayNumber(fairValueLo)} ~ {displayNumber(fairValueHi)}</> : displayNumber()
      },
      editable: true,
    },
    {
      dataIndex: 'id',
      render: (value) => value ? <Tag color="gold">special</Tag> : <Tag color="blue">computed</Tag>
    },
    {
      render: (value, item) => {
        const { id } = item;
        if (!id) return;
        return <ConfirmDeleteButton onOk={() => handleDeleteSpecialFairValue(id)} />
      }
    }
  ];

  const columns = columnDef.map((col) => {
    if (!col.editable) {
      return col;
    }

    return {
      ...col,
      onCell: (record) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave: handleSaveCell,
      }),
    };
  });

  return <Container>
    <Space size="small" direction="vertical" style={{ width: '100%' }}>
      {/* <Space direction="vertical" size="middle">
        {disabled && <Alert type="warning" message="Please setup EPS and EP before setting up Fair Value" showIcon />}
        <Space>
          <Text>Special Fair Value</Text>
          <Switch checked={isSpecialFairValue} onChange={handleSpecialFairSwitchChange} disabled={loading || disabled} />
        </Space>
        <NumberRangeInput
          onSave={handleSaveCell}
          value={[derivedValue?.lo, derivedValue?.hi]}
          disabled={loading || disabled}
          readOnly={!isSpecialFairValue}
          allowInputNone={true}
        />
      </Space> */}
      <Table
        components={{
          body: {
            row: EditableRow,
            cell: EditableCell,
          },
        }}
        columns={columns}
        dataSource={list}
        size="small"
        rowKey={item => item.id ?? item.date}
        rowClassName={() => 'editable-row'}
        loading={loading}
        pagination={false}
        style={{ width: '100%' }}
      />
    </Space>
  </Container>
}

StockFairValueTimelineEditor.propTypes = {
  onLoadList: PropTypes.func.isRequired,
  onSaveNew: PropTypes.func.isRequired,
  onChange: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  onSelected: PropTypes.func,
  getClassNameOnSelect: PropTypes.func,
  showTime: PropTypes.bool,
  sourceEps: PropTypes.array.isRequired,
  sourcePe: PropTypes.array.isRequired,
};

StockFairValueTimelineEditor.defaultProps = {
  showTime: true,
  onChange: () => { },
  onDelete: () => { },
  onSelected: () => { },
  getClassNameOnSelect: () => false,
};
