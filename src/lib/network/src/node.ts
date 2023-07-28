// Copyright 2023 Stichting Block Foundation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


import express from "express";
import bodyParser from "body-parser";

import * as config from "../../blockchain/src/config";
import Blockchain from "../../blockchain/src/blockchain";
import Block from "../../blockchain/src/block";
import P2pServer from "./node_server";
import Wallet from "../../blockchain/src/wallet";
import TransactionPool from "../../blockchain/src//transaction-pool";
import Miner from "./node_miner";

const HTTP_PORT: string = process.env.HTTP_PORT || "3001";

const app = express();
const blockchain: Blockchain = new Blockchain();
const wallet: Wallet = new Wallet();
const tp: TransactionPool = new TransactionPool();
const p2pServer: P2pServer = new P2pServer(blockchain, tp);
const miner = new Miner(blockchain, tp, wallet, p2pServer);

app.use(bodyParser.json());

//view balance
app.get(
    config.ENDPOINT_GET_BALANCE,
    (
        request: any,
        response: { json: (arg0: { balance: number; }) => void; }
    ) => {
        response.json({balance: wallet.calculateBalance(blockchain)});
    }
);

//view all blocks on blockchain
app.get(config.ENDPOINT_GET_BLOCKS, (request, response) => {
    response.json({blockchain: blockchain.chain});
});

//show wallet's public key
app.get(config.ENDPOINT_GET_PUBLIC_KEY, (request, response) => {    
    response.json({publicKey: wallet.publicKey});
});

//view all transactions
app.get(config.ENDPOINT_GET_TRANSACTIONS, (request, response) => {
    response.json({transactions: tp.transactions});
});

//create a transaction with user's wallet and broadcast it to other nodes
app.post(config.ENDPOINT_POST_TRANSACTIONS, (request, response) => {
    let recipient: string = request.body.recipient;
    let amount:number = request.body.amount;
    let transaction = wallet.createOrUpdateTransaction(recipient, amount, blockchain, tp);
    p2pServer.broadcastTx(transaction);
    response.redirect(config.ENDPOINT_GET_TRANSACTIONS);
});

//mines new block with transaction data
app.get(config.ENDPOINT_GET_MINE_TRANSACTIONS, (request, response) => {
    const block: Block = miner.mine();
    console.log("New block added: " + block.toString());
    response.redirect(config.ENDPOINT_GET_BLOCKS);
});

//adds new block to blockchain - generic mine endpoint for mining any data
app.post(config.ENDPOINT_POST_MINE, (request, response) => {
    const block = blockchain.addBlock(request.body.data);
    console.log("New block added: " + block.toString());

    //update other nodes as soon as new block mined
    p2pServer.syncChains();

    //show updated chain with new block
    response.redirect(config.ENDPOINT_GET_BLOCKS);
});

app.listen(HTTP_PORT, () => {
    console.log(`Listening on port ${HTTP_PORT}`);
})


p2pServer.listen();