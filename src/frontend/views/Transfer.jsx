import React, {Component} from "react";
import styled from "styled-components";
import {InputField} from "./design-components/Inputs.js";
import Button from "./design-components/Button.js";
import secp256k1 from "secp256k1";
import {Web3Context} from '../contexts/Web3Context';
import {getDomain} from "../../helpers/getDomain.mjs";
import {withRouter} from 'react-router-dom';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 512px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  margin-top: 20px;
`;

const RowCentered = styled(Row)`
  align-items: center;    //vertical  alignment
`;

const LeftComponent = styled.div`
  width: 18%;
  margin-right: 10px;
`;

const AmountInput = styled(InputField)`
  margin-right: 10px;
`;

const AddressInputField = styled(InputField)`
  width: 100%;
`;

const AmountContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Fee = styled.span`
  font-style: italic;
  margin-left: 5px;
  margin-right: 5px;
`;

const Padded = styled.div`
  padding-left: 8px;
`;

const PKInputField = styled(InputField)`
`;

const PrivateKeyInfo = styled.div`
  font-style: italic;
  margin-left: 10px;
  font-size: 10px;
  line-height: 1.6;
  margin-top: 3px;
`;

const RowMultiLines = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
`;

const WideButton = styled(Button)`
  margin-top: 35px;
  ${props => !props.disabled ? '' : `
    opacity: 0.4
  `}
`;

class Transfer extends Component {
  constructor() {
    super();
    this.state = {
      tokenAddress: null,
      selectedTokenContract: null,
      signature: null,
      from: null,
      isFromValid: null,
      to: null,
      isToValid: null,
      value: null,
      isValueValid: null,
      fee: null,
      nonce: null,
      privateKey: null
    }
  }

  componentDidMount() {
    this.setState({
      selectedTokenContract: this.context.tokenContracts[0],
      fee: 5,
      nonce: 0
      // testing purposes
      ,
      value: 400,
      isValueValid: true,
      from: '0x9ea02Ac11419806aB9d5A512c7d79AC422cB36F7',
      isFromValid: true,
      to: '0xB5227F13682873884a8C394A4a7AcDf369199Dc5',
      isToValid: true,
      privateKey: '3d63b5b61cc9636a143f4d2c56a9609eb459bc2f8f168e448b65f218893fef9f'
    })
  }

  handleInput(stateKey, e) {
    this.setState({[stateKey]: e.target.value})
  }

  validateAddress(stateKey, e) {
    if (this.context.web3.utils.isAddress(e.target.value)) {
      this.setState({[stateKey]: true});
    } else {
      this.setState({[stateKey]: false});
    }
  }

  isServiceContractAddress(e) {
    //TODO access context and more than one service contract

    if (this.context.serviceContracts[0].contractObj && this.context.serviceContracts[0].contractObj.options && this.context.serviceContracts[0].contractObj.options.address && e.target.value)
      return this.context.serviceContracts[0].contractObj.options.address === e.target.value;
    return false;
  }

  signTransactionData() {
    let nonce = Date.now();
    // transferPreSignedHashing from Utils.sol
    // function transferPreSignedHashing(address _token, address _to, uint256 _value, uint256 _fee, uint256 _nonce)
    //   return keccak256(abi.encode(bytes4(0x15420b71), _token, _to, _value, _fee, _nonce));
    let input = this.context.web3.eth.abi.encodeParameters(
      ['bytes4', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      ['0x15420b71',
        this.context.tokenContracts[0].contractObj.options.address,
        this.state.to,
        this.state.value.toString(),
        this.state.fee.toString(),
        nonce.toString()]);
    console.log(input);

    let inputHash = this.context.web3.utils.keccak256(input);
    let privateKey;
    if (this.state.privateKey.substring(0, 2) === "0x")
      privateKey = this.state.privateKey.substring(2);
    else
      privateKey = this.state.privateKey;


    const signObj = secp256k1.sign(
      Buffer.from(inputHash.substring(2), "hex"),
      // 3d63b5b61cc9636a143f4d2c56a9609eb459bc2f8f168e448b65f218893fef9f
      Buffer.from(privateKey, "hex")
    );
    console.log(signObj);

    let signatureInHex = "0x" + signObj.signature.toString('hex') + (signObj.recovery + 27).toString(16);

    this.setState({
      signature: signatureInHex,
      nonce,
      tokenAddress: this.context.tokenContracts[0].contractObj.options.address
    });
  }

  sendSignedTransaction() {

    let transactionObject = this.state;
    delete transactionObject.privateKey;

    console.log("sending this object: ", transactionObject);

    fetch(`${getDomain()}/api/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionObject)
    })
      .then(response => response.json())
      .then(response => {
        console.log(response);
      })
      .catch(err => {
        console.log("something went wrong: ", err)
      });
  }

  render() {
    return (
      <Container>
        <FormContainer>
          <RowCentered>
            <LeftComponent>
              <AmountInput
                placeholder={"Amount"}
                value={this.state.value}
                onChange={e => this.handleInput('value', e)}
              />
            </LeftComponent>
            DOS tokens
          </RowCentered>
          <RowCentered>
            <LeftComponent>
              From:
            </LeftComponent>
            <AddressInputField
              placeholder={"From Address"}
              value={this.state.from}
              onChange={e => {
                this.handleInput('from', e);
                this.validateAddress('isFromValid', e);
              }}
            />
          </RowCentered>
          <RowCentered>
            <LeftComponent>
              To:
            </LeftComponent>
            <AddressInputField
              placeholder={"To Address"}
              value={this.state.to}
              onChange={e => {
                this.handleInput('to', e);
                this.validateAddress('isToValid', e);
                if (this.isServiceContractAddress(e))
                  this.props.history.push(`/transferAndCall`);
              }}
            />
          </RowCentered>
          <Row>
            <LeftComponent>
              Transaction costs:
            </LeftComponent>
            <AmountContainer>
              <div>
                <Fee>
                  {this.state.fee}
                </Fee> DOS
              </div>
              <Padded>
                {'≈'}<Fee>0.20</Fee> ETH
              </Padded>
              <Padded>
                {'≈'}<Fee>0.20</Fee> USD
              </Padded>
            </AmountContainer>
          </Row>
          <RowMultiLines>
            <PKInputField
              placeholder={"Private key of the from address"}
              value={this.state.privateKey}
              onChange={e => this.handleInput('privateKey', e)}
            />
            <PrivateKeyInfo>
              Your private key is only used to sign the entered transation data. It is neither stored nor send
              somewhere.
            </PrivateKeyInfo>
          </RowMultiLines>
          <WideButton
            disabled={!(this.state.isValueValid && this.state.isToValid && this.state.isFromValid)}
            onClick={async () => {
              console.log(this.state.isToValid)
              await this.signTransactionData();
              this.sendSignedTransaction();
            }}>
            Send
          </WideButton>
        </FormContainer>
      </Container>
    );
  }
}

Transfer.contextType = Web3Context;

export default withRouter(Transfer);