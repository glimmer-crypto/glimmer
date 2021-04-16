app.component("balance-lookup-modal", {
  props: ["state"],
  data() {
    return {
      bsModal: null,

      address: "",
      balance: null,
      lastMutualTransaction: null,

      error: false
    }
  },
  template: document.getElementById("balance-lookup-modal-template").innerHTML,
  methods: {
    lookUp() {
      try {
        new glimmer.Key.Public(this.address)
      } catch (err) {
        this.error = true
        return
      }

      const balance = node.table.balances[this.address]
      console.log("lookup", this.address, balance)
      if (balance) {
        this.balance = balance

        this.lastMutualTransaction = app.transactions.find(transaction => {
          return (
            transaction.sender === this.address && transaction.reciever === wallet.public.address ||
            transaction.reciever === this.address && transaction.sender === wallet.public.address
          )
        })
      } else {
        this.balance = false
      }
    },
    amountString,
    formatDate,
    hide() {
      this.state.showing = false
    }
  },
  watch: {
    "state.showing"(showing) {
      if (showing) {
        this.bsModal.show()
      } else {
        this.address = ""
        this.balance = null
        this.lastMutualTransaction = null
        this.error = false

        this.bsModal.hide()
      }
    },
    address() {
      if (this.error) {
        this.error = false
      }
    }
  },
  mounted() {
    const state = this.state

    const modalEl = document.getElementById("balance-lookup-modal")
    this.bsModal = new bootstrap.Modal(modalEl, {
      focus: state.showing
    })

    if (state.showing) {
      this.bsModal.show()
    } else {
      this.bsModal.hide()
    }

    modalEl.addEventListener("hide.bs.modal", () => state.showing = false)
  }
})