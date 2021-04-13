/** @type { glimmer.Wallet } */
var wallet
/** @type { glimmer.Network.Client } */
var client
/** @type { glimmer.Node } */
var node

let storedTable

/**
 * @param { glimmer.Wallet } newWallet
 */
function setupWallet(newWallet) {
  wallet = newWallet
  client = new glimmer.Network.Client(wallet)
  node = new glimmer.Node(wallet, client, storedTable)
  if (app) {
    app.node = true
  }

  node.on("newtable", table => {
    console.log("newtable", table)
    updateAppData()
  })
  node.on("transactioncompleted", transaction => {
    console.log("transactioncompleted", transaction)
    updateAppData()
  })

  updateAppData()
}

function amountString(amount) {
  if (isNaN(amount) || amount === null) { return 0 }

  const major = Math.floor(amount / glimmer.CoinTable.SUBDIVISION).toLocaleString()
  let minor = (amount % glimmer.CoinTable.SUBDIVISION).toString()

  if (minor == 0) { return major }

  const decimals = Math.floor(Math.log10(glimmer.CoinTable.SUBDIVISION))
  while (minor.length < decimals) {
    minor = "0" + minor
  }
  while (minor.endsWith("0")) {
    minor = minor.slice(0, -1)
  }

  return major + "." + minor
}

const biometricType = (function(){
  if (!navigator.credentials) { return null }

  const ua = navigator.userAgent
  if (ua.includes("iPhone") || ua.includes("Macintosh") || ua.includes("iPad")) {
    const version = navigator.userAgent.split("Version/")[1].split(" ")[0]
    const major = parseInt(version)

    if (major >= 14) {
      // https://stackoverflow.com/a/58724631
      const aspect = window.screen.width / window.screen.height
      if (aspect.toFixed(3) === "0.462") {
        return "Face ID"
      } else {
        return "Touch ID"
      }
    }
    console.log(version, major)
  }
  
  return null
}())
console.log("Biometric type", biometricType)

let biometric = {
  type: biometricType,
  enabled: null
}

var app = Vue.createApp({
  data() {
    return {
      node,
      tableId: glimmer.utils.Convert.Base58.normalize(glimmer.CoinTable.identifier),

      existingWallet: null,
      walletEncrypted: false,
      biometric,

      walletModalState: {
        firstTime: true,
        showing: false
      },
      authenticationModalState: {
        showing: false
      },
      securityModalState: {
        firstTime: true,
        showing: false
      },
      walletExportModalState: {
        showing: false
      },
      directTransferModalState: {
        showing: false
      },

      address: nodeWatchers.address(),
      balance: nodeWatchers.balance(),
    }
  },
  methods: {
    showWalletModal() {
      this.walletModalState.showing = true
    },
    showSecurityModal() {
      this.securityModalState.showing = true
    },
    showWalletExportModal() {
      this.walletExportModalState.showing = true
    },
    showDirectTransferModal() {
      this.directTransferModalState.showing = true
    },
    amountString,
    signOut() {
      // Not signed in
      if (this.authenticationModalState.showing) { return }
    
      wallet = undefined
    
      if (client) { client.dispose() }
      client = undefined
    
      node = undefined
      this.node = undefined
    
      this.walletModalState.showing = false
      this.securityModalState.showing = false
      this.walletExportModalState.showing = false
      this.directTransferModalState.showing = false

      passwordHash = undefined
      lastAuthentication = undefined
    
      loadStoredData()
    }
  }
})

const nodeWatchers = {
  address() {
    if (!node) return ""
    return node.wallet.public.address
  },
  balance() {
    if (!node) return { amount: 0 }
    const balance = node.table.balances[wallet.public.address]

    return balance || { amount: 0 }
  }
}

function updateAppData() {
  Object.keys(nodeWatchers).forEach(dataKey => {
    app[dataKey] = nodeWatchers[dataKey]()
  })

  appStorage.setItem("table", node.table.exportBuffer())
}


const appStorage = new AsyncStorage("appStorage")
secureStorage.options.expiration = "load"

async function loadStoredData() {
  await appStorage.open()

  const tableBuffer = await appStorage.getItem("table")
  try {
    const importedTable = glimmer.CoinTable.importBuffer(tableBuffer)
    if (importedTable.isValid) {
      storedTable = importedTable
    } else {
      appStorage.removeItem("table")
    }
  } catch (err) {
    appStorage.removeItem("table")
    console.error(err)
  }

  let existingWallet
  try {
    existingWallet = await appStorage.getItem("wallet")
    if (existingWallet.salt) {
      app.walletEncrypted = true
    } else {
      setupWallet(glimmer.Wallet.importJSON(existingWallet))
    }
  } catch (err) {
    console.error("existing wallet error", err)
    // No existing wallet
  }

  app.existingWallet = existingWallet

  if (existingWallet) {
    app.walletModalState.firstTime = false
    app.securityModalState.firstTime = false

    app.authenticationModalState.showing = !node
  } else {
    app.walletModalState.showing = true
  }

  app.biometric.enabled = await appStorage.getItem("biometric") || false
}
loadStoredData()

// Add Vue types for autocomplete
if (0) {
  /** @type { typeof import("vue") } */
  var Vue
}