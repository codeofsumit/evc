import React from 'react';
import { Button } from 'antd';
import PropTypes from 'prop-types';


const FullCreditPayButton = (props) => {
  const { onProvision, onCommit, onLoading, style } = props;
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    onLoading(loading);
  }, [loading]);

  const handleFullCreditPay = async () => {
    try {
      setLoading(true);
      const { paymentId } = await onProvision();
      await onCommit(paymentId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="primary"
      block
      onClick={handleFullCreditPay}
      size="large"
      disabled={loading}
      loading={loading}
      style={style}
    >Pay with credits</Button>
  );
}

FullCreditPayButton.propTypes = {
  onProvision: PropTypes.func.isRequired,
  onCommit: PropTypes.func.isRequired,
  onLoading: PropTypes.func.isRequired,
};

FullCreditPayButton.defaultProps = {
};

export default FullCreditPayButton;
