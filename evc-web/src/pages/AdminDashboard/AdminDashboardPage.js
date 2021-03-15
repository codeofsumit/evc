import React from 'react';
import ReactDOM from "react-dom";
import styled from 'styled-components';
import { Typography, Collapse, Tag, Badge, Button, Space, Modal } from 'antd';
import { Link, withRouter } from 'react-router-dom';
import { Loading } from 'components/Loading';
import { getDashboard } from 'services/dashboardService';
import { CaretRightOutlined } from '@ant-design/icons';
import { MemberOnlyCard } from 'components/MemberOnlyCard';
import { refreshMaterializedViews } from 'services/dataService';
import { AdminOperationCard } from 'components/AdminOperationCard';

const { Text, Paragraph } = Typography;

const ContainerStyled = styled.div`
width: 100%;

.ant-alert {
  margin-bottom: 10px;
}

`;


const StyledTag = styled(Tag)`
margin-bottom: 8px;
// font-size: 1rem;

&:hover {
  color: #18b0d7;
  text-decoration: underline !important;
}
`;

const CounterBadge = (props) => {
  const count = props.count || 0;
  const backgroundColor = count ? (props.color || '#d7183f') : '#AFAFAF';
  return <Badge overflowCount={9999} count={count} showZero style={{ backgroundColor }} />
}

const LinkTag = props => {
  return <Link to={props.to}>
    <StyledTag>{props.children}</StyledTag>
  </Link>
}

const AdminDashboardPage = () => {

  const [data, setData] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const loadList = async () => {
    try {
      setLoading(true);
      const data = await getDashboard();

      ReactDOM.unstable_batchedUpdates(() => {
        setData(data);
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadList();
  }, []);

  const handleUploadSupportCsv = async () => {

  }

  return (
    <ContainerStyled>
      <Loading loading={loading}>
        <AdminOperationCard
          operationKey="refresh-mv"
          content="Refresh Materialized Views. This operation should only be executed by data admins."
          buttonText="Refresh Materialized Views"
          inProgressMessage="Refreshing materialized views. It may take minutes to complete."
          type="button"
          onOk={refreshMaterializedViews}
        />
        <AdminOperationCard
          operationKey="upload-support-csv"
          content={<>Bulk upload support values from CSV file. The CSV file must have a header row with three columns <Text code>symbol</Text>, <Text code>lo</Text>, <Text code>hi</Text>. Duplicate rows (same symbol, lo and hi values) will be inserted into database only once. A sample is as below.
              <pre><small>
                {`symbol,lo,hi
AAPL,120,150
AAPL,160,180
GOOG,1000,2000
GOOG,2100,2200`}
             </small> </pre>
          </>}
          buttonText="Upload Support"
          inProgressMessage="Uploading support data. It may take minutes to complete."
          type="upload"
          uploadAction="/admin/data/upload/support"
          onOk={handleUploadSupportCsv}
        />
        <AdminOperationCard
          operationKey="upload-resistance-csv"
          content={<>Bulk upload resistance values from CSV file. The CSV file must have a header row with three columns <Text code>symbol</Text>, <Text code>lo</Text>, <Text code>hi</Text>. Duplicate rows (same symbol, lo and hi values) will be inserted into database only once. A sample is as below.
            <pre><small>
              {`symbol,lo,hi
AAPL,120,150
AAPL,160,180
GOOG,1000,2000
GOOG,2100,2200`}
           </small> </pre>
        </>}
          buttonText="Upload Resistance"
          inProgressMessage="Uploading resistance data. It may take minutes to complete."
          type="upload"
          uploadAction="/admin/data/upload/resistance"
          onOk={handleUploadSupportCsv}
        />
        <MemberOnlyCard>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text>Upload unusual options activity</Text>
            <Button type="primary">Import Unusual Options Activity from CSV</Button>
          </Space>
        </MemberOnlyCard>

        <Collapse
          // ghost
          bordered={false}
          defaultActiveKey={['plea']}
          accordion
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        >
          <Collapse.Panel
            key="plea"
            header={<>Unsupported Stock Requests </>}
            extra={<CounterBadge count={data.pleas?.length} color="#18b0d7" />}
          >
            {data.pleas?.map(x => <Paragraph key={x.symbol}>
              <strong>{x.symbol}</strong> has {x.count} requests. <Link to={`/stock?create=${x.symbol}`}>Click to create</Link>
            </Paragraph>)}
          </Collapse.Panel>
          <Collapse.Panel
            key="invalidEps"
            header={<>No fair value (invalid EPS)</>}
            extra={<CounterBadge count={data.noFairValuesByInvalidTtmEps?.length} />}
          >
            <Paragraph>
              {data.noFairValuesByInvalidTtmEps?.map(x => <LinkTag key={x} to={`/stock/${x}`}>{x}</LinkTag>)}
            </Paragraph>
          </Collapse.Panel>
          <Collapse.Panel
            key="noEps"
            header={<>No fair value (no EPS data)</>}
            extra={<CounterBadge count={data.noFairValuesByMissingEpsData?.length} />}
          >
            <Paragraph>
              {data.noFairValuesByMissingEpsData?.map(x => <LinkTag key={x} to={`/stock/${x}`}>{x}</LinkTag>)}
            </Paragraph>
          </Collapse.Panel>
          <Collapse.Panel
            key="noSupport"
            header={<>No support</>}
            extra={<CounterBadge count={data.noSupports?.length} />}
          >
            <Paragraph>
              {data.noSupports?.map(x => <LinkTag key={x} to={`/stock/${x}`}>{x}</LinkTag>)}
            </Paragraph>
          </Collapse.Panel>
          <Collapse.Panel
            key="noResistance"
            header={<>No resistance</>}
            extra={<CounterBadge count={data.noResistances?.length} />}
          >
            <Paragraph>
              {data.noResistances?.map(x => <LinkTag key={x} to={`/stock/${x}`}>{x}</LinkTag>)}
            </Paragraph>
          </Collapse.Panel>
          <Collapse.Panel
            key="onSupport"
            header={<>One support</>}
            extra={<CounterBadge count={data.oneSupports?.length} />}
          >
            <Paragraph>
              {data.oneSupports?.map(x => <LinkTag key={x} to={`/stock/${x}`}>{x}</LinkTag>)}
            </Paragraph>
          </Collapse.Panel>
          <Collapse.Panel
            key="oneResistance"
            header={<>One resistance</>}
            extra={<CounterBadge count={data.oneResistances?.length} />}
          >
            <Paragraph>
              {data.oneResistances?.map(x => <LinkTag key={x} to={`/stock/${x}`}>{x}</LinkTag>)}
            </Paragraph>
          </Collapse.Panel>
        </Collapse>
      </Loading>
    </ContainerStyled>
  );
};

AdminDashboardPage.propTypes = {};

AdminDashboardPage.defaultProps = {};

export default withRouter(AdminDashboardPage);
