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

      this.amount = ""
      this.importedWallet = null
      importTask.stop = null
      if (importTask.progress !== 0) {
        importTask.progress = 0
        await new Promise(r => setTimeout(r, 700))
      }

      if (!this.wallet) {
        this.error = "wallet"
        return
      }

      /** @type { glimmer.Wallet } */
      let importedWallet

      let json = walletJsonFromString(this.wallet)
      if (json) {
        try {
          importedWallet = await glimmer.Wallet.importJSON(json, this.password, importTask)
        } catch(err) {
          importTask.progress = 0

          if (err.message === "Public address incompatible with the private key" || err.message === "Missing password") {
            this.error = "password"
          } else {
            this.error = "wallet"
            console.error(err)
          }
        }
      } else {
        try {
          await loadWordList()

          let seedPhrase = wordList.normalizeSeedPhrase(this.wallet)
          if (!seedPhrase) { seedPhrase = this.wallet }

          importedWallet = await glimmer.Wallet.fromSeedPhrase(seedPhrase, this.password, importTask)
        } catch (err) {
          // In the unlikely event of an error
          this.error = "wallet"
          return
        }
      }
      
      if (importedWallet) {
        importTask.progress = 1
        this.importedWallet = importedWallet
      } else {
        importTask.progress = 0
      }
    },
    amountString,
    async withdraw() {
      const amount = amountFromString(this.amount)
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

        await node.processTransaction(transaction)
        this.recomputeAvailable += 1
      } catch (err) {
        console.error(err)
      }
    },
    async deposit() {
      const amount = amountFromString(this.amount)
      const myBalance = node.table.balances[wallet.public.address]
      if (isNaN(amount) || amount === 0 || !myBalance || amount > myBalance.amount) {
        this.error = "amount"
        return
      }

      /** @type { glimmer.Wallet } */
      const importedWallet = this.importedWallet
      importedWallet.node = node

      try {
        let transaction = wallet.createTransaction(amount, importedWallet.public)
        transaction = importedWallet.signTransaction(transaction)

        await node.processTransaction(transaction)
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
    disablePasswordField() {
      if (!this.wallet) { return true }

      const json = walletJsonFromString(this.wallet)
      if (json) {
        return !json.salt
      } else {
        return false
      }
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
        this.amount = ""
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