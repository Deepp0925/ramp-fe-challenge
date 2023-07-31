import { useCallback } from "react"
import { useCustomFetch } from "src/hooks/useCustomFetch"
import { TransactionPane } from "./TransactionPane"
import { SetTransactionApprovalFunction, TransactionsComponent } from "./types"

export const Transactions: TransactionsComponent = ({ transactions }) => {
  const { loading, fetchAndUpdateTransactionCache } = useCustomFetch()

  const setTransactionApproval = useCallback<SetTransactionApprovalFunction>(
    async ({ transactionId, newValue }) => {
      // BUG 7: Added a new function to update the cache when a transaction is approved
      // other approach would be clearing the cache ('paginatedTransactions' and 'transactionsByEmployee')
      // but that would mean that the user would have to refetch the data
      await fetchAndUpdateTransactionCache<void>(transactionId, newValue)
    },
    [fetchAndUpdateTransactionCache]
  )

  if (transactions === null) {
    return <div className="RampLoading--container">Loading...</div>
  }

  return (
    <div data-testid="transaction-container">
      {transactions.map((transaction) => (
        <TransactionPane
          key={transaction.id}
          transaction={transaction}
          loading={loading}
          setTransactionApproval={setTransactionApproval}
        />
      ))}
    </div>
  )
}
