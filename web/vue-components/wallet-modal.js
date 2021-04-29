/** @type { glimmer.Wallet.WordList } */
var wordList
let wordListLoading
async function loadWordList() {
  if (wordListLoading) {
    return wordListLoading
  } else {
    wordList = await fetch("utils/wordlist.txt").then(req => req.text())
    wordList = wordList.split("\n")
    wordList = new glimmer.Wallet.WordList(wordList)
  }
}
wordListLoading = loadWordList()

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

      generatingSeed: false,
      generatedSeed: false,

      seedDownloadUrl: null,
      importedSeed: null,
      importedWallet: null
    }
  },
  template: document.getElementById("wallet-modal-template").innerHTML,
  methods: {
    async importWallet() {
      const importTask = this.importTask
      if (importTask.progress > 0 && importTask.progress < 1) { return }

      this.seedDownloadUrl = null
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

          if (importedWallet) {
            let url = "data:text/plain," + encodeURIComponent(seedPhrase)
            url += encodeURIComponent("\n\n\nAddress: " + importedWallet.public.address)
            if (this.password) {
              url += encodeURIComponent("\n(The wallet is additionally secured by a password)")
            }
            url += encodeURIComponent("\n\n\n\nWrite down this seed and store it in a secure place")

            this.seedDownloadUrl = url
          }
        } catch (err) {
          // In the unlikely event of an error
          console.error(err)
          
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
    async confirmImportedWallet() {
      const importedWallet = this.importedWallet
      setupWallet(importedWallet)

      this.hide()
      
      if (passwordHash) {
        const encryptedWallet = importedWallet.exportJSON(passwordHash, 100)
        await appStorage.setItem("wallet", encryptedWallet)
      } else {
        await appStorage.setItem("wallet", importedWallet.exportJSON())

        app.walletEncrypted = false
        passwordHash = undefined
        secureStorage.reset()
        app.biometric.enabled = false
        app.securityModalState.firstTime = true

        app.showSecurityModal()
      }
    },
    async generateSeed() {
      this.generatingSeed = true

      this.importedWallet = null
      this.importTask.progress = 0

      await loadWordList()

      this.wallet = wordList.generateSeedPhrase()
      this.generatedSeed = true

      this.generatingSeed = false
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
        this.generatingSeed = false
        this.generatedSeed = false
        this.seedDownloadUrl = null
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

        if (this.generatedSeed && (this.wallet === "" || walletJsonFromString(this.wallet))) {
          this.generatedSeed = false
        }
      }
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
    dangerousSeed() {
      if (!this.wallet) { return false }

      let json = walletJsonFromString(this.wallet)
      if (json) { return false }

      if (!wordList) { return false }
      if (wordList.normalizeSeedPhrase(this.wallet)) { return false }
      return true 
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

/**
 * @param { string } walletString
 */
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

    if (walletString.length >= 42 && walletString.length <= 44 && glimmer.utils.Convert.Base58.isEncodedString(walletString)) {
      return {
        privateKey: walletString
      }
    }
  }

  return null
}