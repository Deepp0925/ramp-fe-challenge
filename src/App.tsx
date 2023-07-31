import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  // const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  // BUG 6 - Need to check if all transactions are loaded
  // returns true if all transactions are loaded
  // returns true if the transactionsByEmployee is not null, meaning that all transactions are loaded
  // otherwise, returns false
  const loadedAllTransactions = useMemo(() => {
    if (paginatedTransactions?.nextPage === null) {
      return true
    }

    // all transactions are loaded if the transactionsByEmployee is not null
    if (transactionsByEmployee !== null) {
      return true
    }

    return false
  }, [paginatedTransactions, transactionsByEmployee])

  const loadAllTransactions = useCallback(async () => {
    // setIsLoading(true)
    // BUG 5 - Needs a new state variable to indicate that the employees are loading/ loaded
    // if its already loaded, it will be instant
    setIsLoadingEmployees(true)
    transactionsByEmployeeUtils.invalidateData()
    await employeeUtils.fetchAll()
    setIsLoadingEmployees(false)
    await paginatedTransactionsUtils.fetchAll()

    // setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={isLoadingEmployees}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null || newValue.id === EMPTY_EMPLOYEE.id) {
              // BUG 3 - Need to load all transactions when the employee id is empty
              await loadAllTransactions()
              return
            }

            await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />

          {!loadedAllTransactions && (
            <button
              className="RampButton"
              disabled={
                paginatedTransactionsUtils.loading ||
                transactionsByEmployeeUtils.loading ||
                isLoadingEmployees
              }
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
