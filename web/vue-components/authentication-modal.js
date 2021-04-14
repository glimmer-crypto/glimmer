app.component("authentication-modal", {
  props: ["state", "wallet", "biometric"],
  data() {
    return {
      bsModal: null,

      password: "",
      error: false,
      failedAttempts: 0
    }
  },
  template: document.getElementById("authentication-modal-template").innerHTML,
  methods: {
    importWallet() {
      const password = glimmer.utils.Convert.bufferToHex(glimmer.utils.hash(this.password))
      this.importWalletWithHash(password)
    },
    importWalletWithHash(password) {
      try {
        const importedWallet = glimmer.Wallet.importJSON(this.wallet, password)
        if (!importedWallet) {
          this.failedAttempts += 1
          return
        }

        setupWallet(importedWallet)
        passwordHash = password
        lastAuthentication = Date.now()

        this.failedAttempts = 0
        this.hide()
        this.password = ""
      } catch (err) {
        console.error(err)

        this.failedAttempts += 1
        this.error = true
      }
    },
    async useBiometric() {
      if (!biometric.enabled) { return }

      try {
        await secureStorage.unlock()
      } catch (err) {
        console.error(err)
        return
      }

      const passwordHash = await secureStorage.getItem("passwordHash")
      this.importWalletWithHash(passwordHash)

      if (this.error) {
        this.biometric.enabled = false
        this.error = false
      }
    },
    reset() {
      app.walletModalState.firstTime = true
      app.securityModalState.firstTime = true
      app.existingWallet = null

      this.failedAttempts = 0
      this.hide()

      app.showWalletModal()
    },
    hide() {
      this.state.showing = false
    }
  },
  watch: {
    "state.showing"(showing) {
      if (showing) {
        this.bsModal.show()
      } else {
        this.bsModal.hide()
      }
    },
    password() {
      if (this.error) {
        this.error = false
      }
    }
  },
  mounted() {
    this.bsModal = new bootstrap.Modal(document.getElementById("authentication-modal"), {
      keyboard: false,
      backdrop: "static",
      focus: this.state.showing
    })

    if (this.state.showing) {
      this.bsModal.show()
    } else {
      this.bsModal.hide()
    }
  }
})

let passwordHash
let lastAuthentication
document.addEventListener("visibilitychange", event => {
  if (document.hidden || !lastAuthentication) { return }

  const msSinceAuthentication = Date.now() - lastAuthentication
  const minutes = 60_000
  if (msSinceAuthentication > 5*minutes) {
    app.signOut()
  }
})