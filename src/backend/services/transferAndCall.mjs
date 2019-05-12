import {tokenContract} from "../../helpers/get-deployed-smart-contracts.mjs";
import Web3PromiEvent from "web3-core-promievent";
import {saveTransaction, updateTransaction} from "../db/transactions-services.mjs";
import {TRANSACTION_STATUS} from "../db/transaction-states.mjs";
import config from "../../config.json"


export const sendTransferAndCallPreSignedTransaction = async (transactionObject) => {

  let promiEvent = Web3PromiEvent();

  tokenContract.methods.transferAndCallPreSigned(
    transactionObject.signature,
    transactionObject.from,
    transactionObject.to,
    transactionObject.value.toString(),
    transactionObject.fee.toString(),
    transactionObject.nonce.toString(),
    transactionObject.methodName,
    transactionObject.callParametersEncoded
  )
    .send({
      from: config.unlockedServiceAccount,
      gas: 80000000
    })
    .on('transactionHash', async tx => {
      promiEvent.eventEmitter.emit('transactionHash', tx);
      promiEvent.resolve(tx);

      saveTransaction(tx, transactionObject, config.unlockedServiceAccount);
    })
    .on('receipt', async receipt => {
      promiEvent.eventEmitter.emit('receipt', receipt);

      updateTransaction(
        receipt.transactionHash,
        receipt.status === true ? TRANSACTION_STATUS.CONFIRMED_SUCCESS : TRANSACTION_STATUS.CONFIRMED_REVERTED,
        receipt
      );

    });

  return promiEvent.eventEmitter;
};