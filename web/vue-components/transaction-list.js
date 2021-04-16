/**
 * @param { Date | number } date
 */
function formatDate(date) {
  if (typeof date === "number") {
    date = new Date(date)
  }

  const now = new Date()

  /** @type { Intl.DateTimeFormatOptions } */
  const options = {
    hour: "numeric",
    minute: "numeric"
  }

  if (date.getUTCFullYear() !== now.getUTCFullYear()) {
    options.year = "numeric"
    options.month = "numeric"
    options.day = "numeric"
  } else if (date.getUTCMonth() !== now.getUTCMonth() || date.getUTCDate() !== now.getUTCDate()) {
    options.month = "short"
    options.day = "numeric"
  }

  return date.toLocaleString(undefined, options)
}

app.component("transaction-list", {
  props: ["transactions", "address"],
  template: document.getElementById("transaction-list-template").innerHTML,
  methods: {
    dateString(transaction) {
      return formatDate(transaction.timestamp)
    },
    amountString,
    otherParty(transaction) {
      if (transaction.sender === this.address) {
        return transaction.reciever
      } else {
        return transaction.sender
      }
    },
    setTransactionFormRecipient(transaction) {
      transactionForm.address = this.otherParty(transaction)
      document.getElementById("transaction-address").focus()
    }
  },
  computed: {
    filteredTransactions() {
      return this.transactions.filter(transaction => {
        return transaction.sender === this.address || transaction.reciever === this.address
      })
    }
  }
})