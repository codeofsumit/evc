import React from 'react';
import 'antd/dist/antd.less';
import { GlobalContext } from './contexts/GlobalContext';
import { RoleRoute } from 'components/RoleRoute';
import UserListPage from 'pages/User/UserListPage';
import AdminDashboardPage from 'pages/AdminDashboard/AdminDashboardPage';
import AdminBlogPage from 'pages/AdminBlog/AdminBlogPage';
import StockRadarPage from 'pages/Stock/StockRadarPage';
import StockWatchListPage from 'pages/Stock/StockWatchListPage';
import TagsSettingPage from 'pages/TagsSettingPage/TagsSettingPage';
import ReferralGlobalPolicyListPage from 'pages/ReferralGlobalPolicy/ReferralGlobalPolicyListPage';
import ConfigListPage from 'pages/Config/ConfigListPage';
import EmailTemplateListPage from 'pages/EmailTemplate/EmailTemplateListPage';
import TranslationListPage from 'pages/Translation/TranslationListPage';
import StockPage from 'pages/StockPage/StockPage';
import ProLayout, { } from '@ant-design/pro-layout';
import Icon, {
  UploadOutlined, StarOutlined, UserOutlined, SettingOutlined, TeamOutlined,
  DashboardOutlined, TagsOutlined, DollarOutlined, QuestionOutlined, AlertOutlined,
  LeftCircleOutlined, RightCircleOutlined
} from '@ant-design/icons';
import { Link, withRouter, Redirect } from 'react-router-dom';
import { logout } from 'services/authService';
import { reactLocalStorage } from 'reactjs-localstorage';
import { Avatar, Space, Dropdown, Menu, Typography, Modal, Button } from 'antd';
import ChangePasswordModal from 'pages/ChangePasswordModal';
import HeaderStockSearch from 'components/HeaderStockSearch';
import styled from 'styled-components';
import ProfileModal from 'pages/Profile/ProfileModal';
import ContactForm from 'components/ContactForm';
import MyAccountPage from 'pages/MyAccount/MyAccountPage';
import AboutDrawer from 'pages/About/AboutDrawer';
import { Route, Switch } from 'react-router-dom';
import { GiReceiveMoney, GiRadarSweep, GiPayMoney } from 'react-icons/gi';
import { BsCalendar } from 'react-icons/bs';
import { FaMoneyBillWave } from 'react-icons/fa';
import { BiDollar } from 'react-icons/bi';
import DataSourcePage from 'pages/AdminDashboard/DataSourcePage';
import UnusualOptionsActivityPage from 'pages/AdminDashboard/UnusualOptionsActivityPage';
import EarnCommissionModal from 'pages/EarnCommissionModal';
import AdminCommissionWithdrawalListPage from 'pages/CommissionWithdrawal/AdminCommissionWithdrawalListPage';
import EarningsCalendarPage from 'pages/AdminDashboard/EarningsCalendarPage';

const { Link: LinkText } = Typography;

const StyledLayout = styled(ProLayout)`
.ant-layout {
  // background-color: white;
}

.ant-pro-global-header {
  padding-left: 24px;
}

.ant-pro-global-header-collapsed-button {
  margin-right: 16px;
}

`;

const StyledMenu = styled(Menu)`
.ant-dropdown-menu-item {
  padding: 12px !important;
}
`;

const ROUTES = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    icon: <DashboardOutlined />,
    roles: ['admin', 'agent']
  },
  {
    path: '/watchlist',
    name: 'Watchlist',
    icon: <StarOutlined />,
    roles: ['member']
  },
  {
    path: '/stock',
    name: 'Stock Radar',
    icon: <Icon component={() => <GiRadarSweep />} />,
    roles: ['admin', 'agent', 'member', 'free']
  },
  {
    path: '/earnings_calendar',
    name: 'Earnings Calendar',
    icon: <Icon component={() => <BsCalendar />} />,
    roles: ['admin', 'agent', 'member', 'free']
  },
  {
    path: '/unsual_options_activity',
    name: 'Unusual Options Activity',
    icon: <AlertOutlined />,
    roles: ['admin', 'agent', 'member']
  },
  {
    path: '/user',
    name: 'Users',
    icon: <TeamOutlined />,
    roles: ['admin', 'agent']
  },
  {
    path: '/account',
    name: 'Account',
    icon: <Icon component={() => <BiDollar />} />,
    roles: ['member', 'free'],
  },
  {
    path: '/referral',
    name: 'Earn Commission 🔥',
    icon: <Icon component={() => <GiReceiveMoney />} />,
    roles: ['member', 'free'],
  },
  {
    path: '/data',
    name: 'Data Management',
    icon: <UploadOutlined />,
    roles: ['admin', 'agent']
  },
  {
    path: '/comission',
    name: 'Commission Withdrawal',
    icon: <Icon component={() => <FaMoneyBillWave />} />,
    roles: ['admin', 'agent']
  },
  {
    path: '/settings',
    name: 'Settings',
    icon: <SettingOutlined />,
    roles: ['admin', 'agent'],
    routes: [
      {
        path: '/tags',
        name: 'Tags',
      },
      {
        path: '/config',
        name: 'Configuration',
      },
      {
        path: '/email_template',
        name: 'Email Templates',
      },
      {
        path: '/translation',
        name: 'Translations',
      },
      {
        path: '/referral_policy',
        name: 'Global Referral Policy',
      },
    ]
  },
];

function getSanitizedPathName(pathname) {
  const match = /\/[^/]+/.exec(pathname);
  return match ? match[0] ?? pathname : pathname;
}

const AppLoggedIn = props => {

  const { history } = props;

  const context = React.useContext(GlobalContext);
  const [changePasswordVisible, setChangePasswordVisible] = React.useState(false);
  const [profileVisible, setProfileVisible] = React.useState(false);
  const [contactVisible, setContactVisible] = React.useState(false);
  const [aboutVisible, setAboutVisible] = React.useState(false);
  const [earnCommissionVisible, setEarnCommissionVisible] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [pathname, setPathname] = React.useState(getSanitizedPathName(props.location.pathname));

  const { user, role, setUser } = context;
  if (!user) {
    return null;
  }
  const isAdmin = role === 'admin';
  const isFree = role === 'free';
  const isMember = role === 'member';
  const isAgent = role === 'agent';


  const routes = ROUTES.filter(x => !x.roles || x.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    reactLocalStorage.clear();
    setUser(null);
    // debugger;
    history.push('/');
  }

  const avatarMenu = <StyledMenu>
    <Menu.Item key="email" disabled={true}>
      <pre style={{ fontSize: 14, margin: 0 }}>{user.profile.email}</pre>
    </Menu.Item>
    <Menu.Divider />
    <Menu.Item key="profile" onClick={() => setProfileVisible(true)}>Profile</Menu.Item>
    <Menu.Item key="change_password" onClick={() => setChangePasswordVisible(true)}>Change Password</Menu.Item>
    <Menu.Divider />
    <Menu.Item key="logout" danger onClick={handleLogout}>Log Out</Menu.Item>
  </StyledMenu>

  return <StyledLayout
    title="EasyValueCheck"
    logo="/favicon-32x32.png"
    route={{ routes }}
    location={{ pathname }}
    navTheme="dark"
    siderWidth={240}
    fixSiderbar={true}
    fixedHeader={true}
    headerRender={true}
    collapsed={collapsed}
    onCollapse={setCollapsed}
    menuItemRender={(item, dom) => {
      if (item.path === '/referral') {
        return <div onClick={() => setEarnCommissionVisible(true)}>
          {dom}
        </div>
      } else {

        return <Link to={item.path} onClick={() => {
          setPathname(item.path);
        }}>
          {dom}
        </Link>
      }
    }}
    // collapsedButtonRender={false}
    // postMenuData={menuData => {
    //   return [
    //     {
    //       icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
    //       name: ' ',
    //       onTitleClick: () => setCollapsed(!collapsed),
    //     },
    //     ...menuData
    //   ]
    // }}
    headerContentRender={() => (
      <Space>
        {/* <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              position: 'relative',
              top: '20px',
              left: '-24px',
              cursor: 'pointer',
              // fontSize: '16px',
              backgroundColor: '#00293d',
              width: '20px',
              color: 'white'
            }}
          >
            {collapsed ? <RightCircleOutlined /> : <LeftCircleOutlined />}
          </div> */}
        <HeaderStockSearch />
      </Space>
    )}
    rightContentRender={() => (
      <div style={{ marginLeft: 16 }}>
        <Dropdown overlay={avatarMenu} trigger={['click']}>
          <a onClick={e => e.preventDefault()}>
            <Avatar size={40}
              icon={<UserOutlined style={{ fontSize: 20 }} />}
              style={{ backgroundColor: isAdmin ? '#00293d' : isAgent ? '#3273A4' : '#15be53' }}
            />
          </a>
        </Dropdown>
      </div>
    )}
    menuFooterRender={props => (
      props?.collapsed ?
        <QuestionOutlined style={{ color: 'rgba(255,255,255,0.65' }} onClick={() => setCollapsed(!collapsed)} /> :
        <Space direction="vertical" style={{ width: 188 }}>
          <LinkText onClick={() => setContactVisible(true)}>Contact Us</LinkText>
          <LinkText onClick={() => setAboutVisible(true)}>About</LinkText>
          <LinkText href="/terms_and_conditions" target="_blank">Terms and Conditions</LinkText>
          <LinkText href="/privacy_policy" target="_blank">Privacy Policy</LinkText>
        </Space>
    )}
  >
    <Switch>
      <RoleRoute visible={isAdmin} exact path="/dashboard" component={AdminDashboardPage} />
      <RoleRoute visible={isMember || isFree} path="/watchlist" exact component={StockWatchListPage} />
      <RoleRoute visible={!isFree} exact path="/unsual_options_activity" component={UnusualOptionsActivityPage} />
      <RoleRoute visible={true} path="/stock" exact component={StockRadarPage} />
      <RoleRoute visible={true} path="/stock/:symbol" exact component={StockPage} />

      <RoleRoute visible={true} exact path="/earnings_calendar" component={() => <EarningsCalendarPage onSymbolClick={symbol => props.history.push(`/stock/${symbol}`)} />} />
      <RoleRoute visible={isAdmin} exact path="/blogs/admin" component={AdminBlogPage} />
      <RoleRoute visible={isAdmin} exact path="/user" component={UserListPage} />
      <RoleRoute visible={isAdmin} exact path="/tags" component={TagsSettingPage} />
      <RoleRoute visible={isAdmin} exact path="/config" component={ConfigListPage} />
      <RoleRoute visible={isAdmin} exact path="/email_template" component={EmailTemplateListPage} />
      <RoleRoute visible={isAdmin} exact path="/translation" component={TranslationListPage} />
      <RoleRoute visible={isAdmin} exact path="/referral_policy" component={ReferralGlobalPolicyListPage} />
      <RoleRoute visible={isAdmin} exact path="/data" component={DataSourcePage} />
      <RoleRoute visible={isAdmin} exact path="/comission" component={AdminCommissionWithdrawalListPage} />
      <RoleRoute visible={isMember || isFree} path="/account" exact component={MyAccountPage} />
      <Redirect to={(isAdmin || isAgent) ? '/dashboard' : '/stock'} />
    </Switch>

    <ChangePasswordModal
      visible={changePasswordVisible}
      onOk={() => setChangePasswordVisible(false)}
      onCancel={() => setChangePasswordVisible(false)}
    />
    <ProfileModal
      visible={profileVisible}
      onOk={() => setProfileVisible(false)}
      onCancel={() => setProfileVisible(false)}
    />
    <Modal
      title="Contact Us"
      visible={contactVisible}
      onOk={() => setContactVisible(false)}
      onCancel={() => setContactVisible(false)}
      footer={null}
      destroyOnClose={true}
      maskClosable={false}
    >
      <ContactForm onDone={() => setContactVisible(false)}></ContactForm>
    </Modal>
    <AboutDrawer
      visible={aboutVisible}
      onClose={() => setAboutVisible(false)}
    />
    {(isMember || isFree) && <EarnCommissionModal
      visible={earnCommissionVisible}
      onOk={() => setEarnCommissionVisible(false)}
      onCancel={() => setEarnCommissionVisible(false)}
    />}
  </StyledLayout>
}

export default withRouter(AppLoggedIn);
