app.component("wallet-export-modal", {
  props: ["state"],
  data() {
    return {
      bsModal: null,
      
      securityLevel: 3,
      password: "",
      exportTask: {
        progress: 0
      },
      json: "",

      showPrivate: false,
    }
  },
  template: document.getElementById("wallet-export-modal-template").innerHTML,
  methods: {
    async exportWallet() {
      const exportTask = this.exportTask
      if (exportTask.progress > 0 && exportTask.progress < 1) { return }

      exportTask.stop = null
      if (exportTask.progress !== 0) {
        exportTask.progress = 0
        await new Promise(r => setTimeout(r, 700))
      }

      let password
      if (this.password) {
        password = this.password
      }

      const securityLevelOptions = [3_000, 10_000, 15_000, 30_000, 50_000, 100_000, 500_000]
      const iterations = securityLevelOptions[this.securityLevel]

      const exportedWallet = await wallet.exportJSON(password, iterations, exportTask)
      if (exportedWallet) {
        exportTask.progress = 1
        this.json = JSON.stringify(exportedWallet, null, 2)
      } else {
        exportTask.progress = 0
        this.json = ""
      }
    },
    privateKey() {
      if (this.showPrivate && wallet) {
        return wallet.private.stringRepresentation
      }
      return "••••••••••••••••••••••••••••••••••••••••••••"
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
        this.password = ""
        this.exportTask.progress = 0
        this.json = ""
        this.showPrivate = false
        this.error = null

        this.bsModal.hide()
      }
    }
  },
  mounted() {
    const modalEl = document.getElementById("wallet-export-modal")
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