app.component("direct-transfer-modal", {
  props: ["state"],
  data() {
    return {
      bsModal: null,

      wallet: "",
      password: "",
      error: null,
      importTask: {
        progress: 0
      },

      importedWallet: null,
      amount: "",
      recomputeAvailable: 0
    }
  },
  template: document.getElementById("direct-transfer-modal-template").innerHTML,
  methods: {
    async importWallet() {
      const importTask = this.importTask
      if (importTask.progress > 0 && importTask.progress < 1) { return }

      let json = walletJsonFromString(this.wallet)
      if (!json) {
        this.error = "wallet"
        return
      }

      this.importedWallet = null
      importTask.stop = null
      if (importTask.progress !== 0) {
        importTask.progress = 0
        await new Promise(r => setTimeout(r, 700))
      }

      try {
        const importedWallet = await glimmer.Wallet.importJSON(json, this.password, importTask)
        if (importedWallet) {
          importTask.progress = 1
        } else {
          importTask.progress = 0
          return
        }

        this.importedWallet = importedWallet
      } catch (err) {
        console.error(err)
        importTask.progress = 0

        if (err.message === "Public address incompatible with the private key") {
          this.error = "password"
        } else {
          this.error = "wallet"
        }
      }
    },
    amountString,
    async transfer() {
      const amount = amountFromString(this.amount)
      console.log(this.amount, amount)
      if (isNaN(amount) || amount === 0 || amount > this.availableFunds) {
        this.error = "amount"
        return
      }

      /** @type { glimmer.Wallet } */
      const importedWallet = this.importedWallet
      importedWallet.node = node

      try {
        let transaction = importedWallet.createTransaction(amount, wallet.public)
        transaction = wallet.signTransaction(transaction)

        console.log(transaction)

        node.table.applyTransaction(transaction)
        client.shareTransaction(transaction)
        updateAppData()
        this.recomputeAvailable += 1
      } catch (err) {
        console.error(err)
      }
    },
    hide() {
      this.state.showing = false
    }
  },
  computed: {
    passwordRequired() {
      const json = walletJsonFromString(this.wallet)
      return !!json.salt
    },
    availableFunds() {
      this.recomputeAvailable;

      if (this.importedWallet) {
        const address = this.importedWallet.public.address
        const balance = node.table.balances[address]

        if (balance) {
          return balance.amount
        }
      }
    }
  },
  watch: {
    "state.showing"(showing) {
      if (showing) {
        this.bsModal.show()
      } else {
        this.wallet = ""
        this.password = ""
        this.error = null
        this.importTask.progress = 0
        this.importedWallet = null

        this.bsModal.hide()
      }
    },
    password() {
      if (this.error === "password") {
        this.error = null
      }
    },
    wallet() {
      if (this.error === "wallet") {
        this.error = null
      }
    },
    amount() {
      if (this.error === "amount") {
        this.error = null
      }
    }
  },
  mounted() {
    const state = this.state

    const modalEl = document.getElementById("direct-transfer-modal")
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