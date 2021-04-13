app.component("wallet-modal", {
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

      importedWallet: null
    }
  },
  template: document.getElementById("wallet-modal-template").innerHTML,
  methods: {
    async importWallet() {
      const importTask = this.importTask
      if (importTask.progress > 0 && importTask.progress < 1) { return }

      let json = walletJsonFromString(this.wallet)
      if (!json) {
        this.error = "wallet"
        return
      } else if (json.salt && !this.password) {
        this.error = "password"
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
    confirmImportedWallet() {
      const importedWallet = this.importedWallet

      setupWallet(importedWallet)
      appStorage.setItem("wallet", importedWallet.exportJSON())
      
      this.reset()
    },
    generateWallet() {
      const newWallet = glimmer.Wallet.generate()
      setupWallet(newWallet)
      appStorage.setItem("wallet", newWallet.exportJSON())

      this.reset()
    },
    reset() {
      app.walletEncrypted = false
      passwordHash = undefined
      secureStorage.reset()
      app.biometric.enabled = false
      app.securityModalState.firstTime = true
      
      this.hide()
      app.showSecurityModal()
    },
    hide() {
      this.state.showing = false
      this.state.firstTime = false
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
    "state.firstTime"(firstTime) {
      if (firstTime) {
        this.bsModal._config.backdrop = "static"
        this.bsModal._config.keyboard = false
      } else {
        this.bsModal._config.backdrop = true
        this.bsModal._config.keyboard = true
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
    }
  },
  computed: {
    passwordRequired() {
      const json = walletJsonFromString(this.wallet)
      return !!json.salt
    }
  },
  mounted() {
    const state = this.state

    const modalEl = document.getElementById("wallet-modal")
    this.bsModal = new bootstrap.Modal(modalEl, {
      keyboard: !state.firstTime,
      backdrop: state.firstTime ? "static" : true,
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

function walletJsonFromString(walletString) {
  try {
    const json = JSON.parse(walletString)
    if (
      typeof json === "object" && json.privateKey &&
      glimmer.utils.Convert.Base58.isEncodedString(json.privateKey)
    ) {
      return json
    }
  } catch (err) {
    if (!err.message.startsWith("JSON")) {
      console.error(err)
    }

    if (glimmer.utils.Convert.Base58.isEncodedString(walletString)) {
      return {
        privateKey: walletString
      }
    }
  }

  return null
}