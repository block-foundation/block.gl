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


import Transaction from "./transaction";

export default class TransactionPool {
    transactions: Transaction [];

    constructor() {
        this.transactions = [];
    }

    /**
     * Clears transaction pool to be empty.
     */
    clear(): void {
        this.transactions = [];
    }

    /**
     * Looks for that transaction in the Transaction Pool and if it's there, replaces it
     * with the passed in transaction. If it's not in the pool, adds it to the pool.
     * Uses transaction's ID field to look for transactions in the pool.
     * @param transaction Transaction to add to pool or replace existing transaction in the pool.
     */
    updateOrAddTransaction(transaction: Transaction): void {
        let foundTx: Transaction = <Transaction> this.transactions.find(
            tx => tx.id === transaction.id);

        //transaction already exists so it needs to replaced
        if(foundTx) {
            this.transactions[this.transactions.indexOf(foundTx)] = transaction;
        }
        //transaction doesn't exist already in the pool, so will be added
        else {
            this.transactions.push(transaction);
       }
    }

    findTransaction(address: string): Transaction {
        return <Transaction> this.transactions.find(
            tx => tx.txInput.address === address);
    }

    /**
     * Validates transactions by:
     * - checking that the TransactionInput's starting balance + all subsequent TransactionOutput amounts = current balance
     * - verify signature of every transaction
     * @returns Array of valid transactions.
     */
    validTransactions() : Transaction [] {
        let validTransactions: Transaction [] = [];

        this.transactions.forEach(tx => {
            let startingBalance = tx.txInput.amount;
            let outputBalance:number = 0;
            tx.txOutputs.forEach(txOutput => {
                outputBalance += txOutput.amount;
            })
            if(outputBalance !== startingBalance) {
                console.log("Invalid transaction (balance) from address: " + tx.txInput.address);
                return;
            }
            if(!Transaction.verifyTransaction(tx)) {
                console.log("Invalid transaction (signature) from address: " + tx.txInput.address);
                return;
            }
            validTransactions.push(tx);
        });
        return validTransactions;
    }
}