function amountFromString(string) {
  const split = string.split(".")
  const major = parseInt(split[0]) * glimmer.CoinTable.SUBDIVISION
  if (split.length === 1) {
    return major
  }

  let minorStr = split[1]
  const decimals = Math.floor(Math.log10(glimmer.CoinTable.SUBDIVISION))
  while (minorStr.length < decimals) {
    minorStr += "0"
  }

  const minor = parseInt(minorStr)
  return major + minor
}

app.component("transaction-form", {
  data() {
    return {
      amount: "",
      address: "",
      error: null
    }
  },
  template: document.getElementById("transaction-form-template").innerHTML,
  methods: {
    sendTransaction() {
      const amount = amountFromString(this.amount)
      if (amount > app.balance.amount || isNaN(amount)) {
        this.error = "amount"
        return
      }

      try {
        new glimmer.Key.Public(this.address)
      } catch (err) {
        console.error(err)
        this.error = "address"
        return
      }

      node.sendTransaction(amount, this.address)
    }
  },
  watch: {
    amount() {
      if (this.error === "amount") {
        this.error = null
      }
    },
    address() {
      if (this.error === "address") {
        this.error = null
      }
    }
  }
})