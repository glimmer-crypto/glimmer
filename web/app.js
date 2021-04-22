/** @type { glimmer.Wallet } */
var wallet
/** @type { glimmer.Network.Client } */
var client
/** @type { glimmer.Node } */
var node

let storedTable
let knownServers = [
  { address: "3HzSquXCpBbMWKffV288Cc1TcgqfgdpaAQcDw2etTrKezf", host: "server0.glimmercrypto.repl.co" }
]

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

  knownServers.forEach(server => {
    client.connectToWebSocket(server.host, server.address)
  })

  node.on("newtable", table => {
    console.log("newtable", table)
    updateAppData()
  })
  node.on("transactioncompleted", transaction => {
    console.log("transactioncompleted", transaction)
    updateAppData()

    if (transaction.sender === wallet.public.address || transaction.reciever === wallet.public.address) {
      app.transactions.unshift({
        amount: transaction.amount,
        sender: transaction.sender,
        reciever: transaction.reciever,
        timestamp: transaction.timestamp
      })

      const clonable = app.transactions.reduce((filtered, transaction) => {
        let previousTransaction = filtered[filtered.length - 1]
        if (!previousTransaction || previousTransaction.timestamp > transaction.timestamp) {
          filtered.push(Object.assign({}, transaction))
        }

        return filtered
      }, []) // This will fix problems caused previously

      appStorage.setItem("transactions", clonable)
    }
  })

  client.on("connection", (conn) => {
    console.log("connection", conn)
  })
  client.on("disconnection", (conn) => {
    console.log("disconnection", conn)

    if (!client) { return }

    let connected = false
    for (const connection of client.allConnections) {
      if (connection.state === "open") {
        connected = false
        break
      }
    }

    if (!connected) {
      console.log("No remaining connections")
    }
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
  }
  
  return null
}())

let biometric = {
  type: biometricType || "Biometric",
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

      transactions: [],

      walletModalState: {
        firstTime: true,
        showing: false
      },
      securityModalState: {
        firstTime: true,
        showing: false
      },
      authenticationModalState: { showing: false },
      walletExportModalState: { showing: false },
      directTransferModalState: { showing: false },
      balanceLookupModalState: { showing: false },

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
    showBalanceLookupModal() {
      this.balanceLookupModalState.showing = true
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
      this.balanceLookupModalState.showing = false

      passwordHash = undefined
      lastAuthentication = undefined
      secureStorage.lock()
    
      loadStoredData()
    }
  },
  watch: {
    "biometric.enabled"(enabled) {
      if (enabled) {
        appStorage.setItem("biometric", true)
      } else {
        appStorage.removeItem("biometric")
      }
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

  const storedTransactions = await appStorage.getItem("transactions")
  if (storedTransactions && storedTransactions.length) {
    app.transactions = []

    storedTransactions.forEach(transaction => {
      app.transactions.push(transaction)
    })
  }
}
loadStoredData()

// Add Vue types for autocomplete
if (0) {
  /** @type { typeof import("vue") } */
  var Vue
}