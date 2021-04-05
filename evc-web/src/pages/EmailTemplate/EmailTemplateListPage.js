import React from 'react';
import styled from 'styled-components';
import { Typography, Layout, Button, Divider, Input, Form, Tooltip, Tag, Drawer, List, Row } from 'antd';
import {
  EditOutlined
} from '@ant-design/icons';
import { withRouter } from 'react-router-dom';
import { Space } from 'antd';
import * as _ from 'lodash';
import { listEmailTemplate, saveEmailTemplate } from 'services/emailTemplateService';
import { LocaleSelector } from 'components/LocaleSelector';
import 'react-quill/dist/quill.snow.css';
import loadable from '@loadable/component'

const ReactQuill = loadable(() => import('react-quill'));

const { Title, Text } = Typography;

const ContainerStyled = styled.div`
  width: 100%;
`;

const StyledTitleRow = styled.div`
 display: flex;
 justify-content: space-between;
 align-items: center;
 width: 100%;
`

const StyledLabel = props => <Text style={{ width: '3rem' }} type="secondary">
  <small>{props.children}</small>
</Text>

const modules = {
  toolbar: [
    [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' },
    { 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }, { 'color': [] }, { 'background': [] }],
    ['link', 'image'],
    ['clean']
  ],
  clipboard: {
    // toggle to add extra line breaks when pasting HTML:
    matchVisual: false,
  }
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'color', 'background',
  'link', 'image'
];

const getLocaleTag = (locale) => {
  switch (locale) {
    case 'zh-CN':
      return <Tag color="#f50">简</Tag>
    case 'zh-TW':
      return <Tag color="#3b5999">繁</Tag>
    case 'en-US':
      return <Tag color="#2db7f5">EN</Tag>
    default:
      return <Tag>{locale}</Tag>
  }
}

const EmailTemplateListPage = () => {

  const [loading, setLoading] = React.useState(true);
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const [currentItem, setCurrentItem] = React.useState();
  const [list, setList] = React.useState([]);

  const handleEdit = item => {
    setCurrentItem(item);
    setDrawerVisible(true);
  }



  const loadList = async () => {
    try {
      setLoading(true);
      setList(await listEmailTemplate());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadList();
  }, []);

  const handleSaveNew = async (values) => {
    try {
      setLoading(true);
      const { locale, key, ...payload } = values;
      await saveEmailTemplate(locale, key, payload);
      setDrawerVisible(false);
      await loadList();
    } finally {
      setLoading(false);

    }
  }


  return (
    <ContainerStyled>
      <Space direction="vertical" style={{ width: '100%' }}>
        <StyledTitleRow>
          <Title level={2} style={{ margin: 'auto' }}>Email Template</Title>
        </StyledTitleRow>
        {/* <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button type="primary" ghost onClick={() => handleCreateNew()} icon={<PlusOutlined />} />
          </Space> */}
        {/* <Table columns={columnDef}
            dataSource={list}
            size="small"
            rowKey={item => `${item.key}.${item.locale}`}
            loading={loading}
            pagination={false}
          /> */}
        <List
          itemLayout="vertical"
          size="large"
          dataSource={list}
          footer={null}
          renderItem={item => <List.Item
            key={item.key}
            extra={<Tooltip key="edit" placement="bottom" title="Edit">
              <Button type="link" icon={<EditOutlined />}
                onClick={() => handleEdit(item)} ></Button>
            </Tooltip>}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={3}>{item.key} {getLocaleTag(item.locale)}</Title>
              {item.key !== 'signature' && <Row>
                <StyledLabel>vars:</StyledLabel>
                {item.vars?.map((v, i) => <Text code key={i} >{v}</Text>)}
              </Row>}
              <Divider dashed style={{ margin: '10px 0' }} />
              {item.key !== 'signature' && <Text>{item.subject || 'Subject'}</Text>}
              <ReactQuill className="body-preview" value={item.body || `Email body`} readOnly theme="bubble" />
            </Space>
          </List.Item>}
        />
      </Space>
      <Drawer
        // title=" "
        id="scrolling-container"
        visible={drawerVisible}
        closable={true}
        maskClosable={true}
        onClose={() => setDrawerVisible(false)}
        width={600}
        destroyOnClose={true}
      >
        <Form
          layout="vertical"
          onFinish={handleSaveNew}
          initialValues={{ ...currentItem, body: currentItem?.body || '' }}
        >
          <Form.Item label="Key" name="key" rules={[{ required: true, whitespace: true, message: ' ' }]}>
            <Input allowClear autoFocus disabled={true} />
          </Form.Item>
          <Form.Item label="Locale" name="locale" rules={[{ required: true, whitespace: true, message: ' ' }]}>
            <LocaleSelector disabled={currentItem || loading} />
          </Form.Item>
          <Form.Item label="Subject" name="subject" rules={[{ required: false, whitespace: true, message: ' ' }]}>
            <Input allowClear disabled={loading} />
          </Form.Item>
          <Form.Item label="Body" name="body" rules={[{ required: false, whitespace: true, message: ' ' }]}>
            <ReactQuill scrollingContainer="#scrolling-container" modules={modules} formats={formats}
              style={{
                padding: 0,
                fontSize: 14,
              }}
              disabled={loading} />
          </Form.Item>
          <Form.Item>
            <Button block type="primary" htmlType="submit" disabled={loading}>Save</Button>
          </Form.Item>
        </Form>
      </Drawer>
    </ContainerStyled>

  );
};

EmailTemplateListPage.propTypes = {};

EmailTemplateListPage.defaultProps = {};

export default withRouter(EmailTemplateListPage);
