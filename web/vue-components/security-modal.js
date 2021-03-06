app.component("security-modal", {
  props: ["state", "address", "existingPassword", "biometric"],
  data() {
    return {
      bsModal: null,

      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      error: null
    }
  },
  template: document.getElementById("security-modal-template").innerHTML,
  methods: {
    async setPassword() {
      const hashedCurrentPassword = glimmer.utils.Convert.bufferToHex(glimmer.utils.hash(this.currentPassword))
      if (this.existingPassword && hashedCurrentPassword !== passwordHash) {
        this.error = "currentpassword"
        return
      } else if (!this.newPassword) {
        this.error = "newpassword"
        return
      } else if (this.newPassword !== this.confirmPassword) {
        this.error = "confirm"
        return
      }

      const password = glimmer.utils.Convert.bufferToHex(glimmer.utils.hash(this.newPassword))
      await appStorage.setItem("wallet", wallet.exportJSON(password, 100))

      app.walletEncrypted = true
      passwordHash = password

      this.state.firstTime = false
    },
    async enableBiometric() {
      if (biometric.enabled || !passwordHash) { return }

      const name = "Glimmer Wallet"
      const id = new Uint8Array([71, 108, 105, 109, 109, 101, 114])

      try {
        await secureStorage.unlock({
          user: {
            id, name,
            displayName: name
          }
        })
  
        await secureStorage.setItem("passwordHash", passwordHash)
        this.biometric.enabled = true
      } catch (err) {
        console.error(err)
      }
    },
    async disableBiometric() {
      if (!biometric.enabled) { return }

      await secureStorage.reset()
      this.biometric.enabled = false
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
        this.currentPassword = ""
        this.newPassword = ""
        this.confirmPassword = ""

        this.state.firstTime = false

        this.bsModal.hide()
      }
    },
    currentPassword() {
      if (this.error === "currentpassword") {
        this.error = null
      }
    },
    newPassword() {
      if (this.error === "newpassword") {
        this.error = null
      }
    },
    confirmPassword() {
      if (this.error === "confirm") {
        this.error = null
      }
    }
  },
  mounted() {
    const modalEl = document.getElementById("security-modal")
    this.bsModal = new bootstrap.Modal(modalEl, {
      focus: this.state.showing
    })

    if (this.state.showing) {
      this.bsModal.show()
    } else {
      this.bsModal.hide()
    }

    modalEl.addEventListener("hide.bs.modal", () => this.state.showing = false)
  }
})