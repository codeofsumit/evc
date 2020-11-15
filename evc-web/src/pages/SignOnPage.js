import React from 'react';
import styled from 'styled-components';
import { Link, withRouter } from 'react-router-dom';
import { Typography, Button, Modal, Form, Input, Checkbox, Layout, Divider } from 'antd';
import { Logo } from 'components/Logo';
import { signOn } from 'services/authService';
import { GlobalContext } from 'contexts/GlobalContext';
import GoogleSsoButton from 'components/GoogleSsoButton';
import GoogleLogoSvg from 'components/GoogleLogoSvg';
import SignUpForm from 'components/SignUpForm';
const { Title, Text } = Typography;

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  // background-color: #f3f3f3;
`;

const ContainerStyled = styled.div`
  margin: 0 auto;
  padding: 2rem 1rem;
  text-align: center;
  max-width: 400px;
  // background-color: #f3f3f3;
`;


const LayoutStyled = styled(Layout)`
  margin: 0 auto 0 auto;
  background-color: #ffffff;
  height: 100%;
`;

const SignOnPage = (props) => {

  const [sending, setSending] = React.useState(false);


  return (
    <GlobalContext.Consumer>{
      () => {

        return <LayoutStyled>
          <PageContainer>
            <ContainerStyled>
              <Logo />
              <SignUpForm onOk={() => props.history.push('/')} />
            </ContainerStyled>
          </PageContainer>
        </LayoutStyled>;
      }
    }</GlobalContext.Consumer>

  );
}

SignOnPage.propTypes = {};

SignOnPage.defaultProps = {};

export default withRouter(SignOnPage);
