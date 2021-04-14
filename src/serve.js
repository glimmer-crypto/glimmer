// @ts-check

require("dotenv").config()
const fs = require("fs")
const projectRoot = __dirname + "/.."

const { CoinTable, Wallet, Node, Key, Network, utils } = require("../coin-table/dist")
require("./initialize")

/** @type { Wallet } */
let wallet
try {
  wallet = Wallet.importJSON(process.env.WALLET)
} catch (err) {
  wallet = Wallet.generate()

  try {
    const env = fs.readFileSync(projectRoot + "/.env").toString()
    const envLines = env.split("\n")

    let noExistingWallet = true
    const newEnvLines = envLines.map(line => {
      if (line.startsWith("WALLET=")) {
        noExistingWallet = false
        return "WALLET=" + JSON.stringify(wallet.exportJSON())
      } else {
        return line
      }
    })

    if (noExistingWallet) {
      newEnvLines.push("WALLET=" + JSON.stringify(wallet.exportJSON()))
    }
    fs.writeFileSync(projectRoot + "/.env", newEnvLines.join("\n"))
  } catch (err) {
    console.error(err)
  }
}

let savedTable
try {
  const fileData = fs.readFileSync(projectRoot + "/storage/table.glm")
  const tableBuffer = new Uint8Array(fileData)
  savedTable = CoinTable.importBuffer(tableBuffer)
} catch (err) {
  // No stored table yet

  if (err.code !== "ENOENT") {
    console.log(err)
  }
}

let knownServers = [
  { address: "3HzSquXCpBbMWKffV288Cc1TcgqfgdpaAQcDw2etTrKezf", host: "server0.glimmercrypto.repl.co" }
]
try {
  const json = fs.readFileSync(projectRoot + "/storage/servers.json").toString()
  const servers = JSON.parse(json)
  Object.keys(servers).forEach(address => {
    knownServers.push({
      address, host: servers[address]
    })
  })
} catch (err) {
  // No stored servers yet
  
  if (err.code !== "ENOENT") {
    console.log(err)
  }
}
console.log("Known servers", knownServers)

console.log("Wallet: ", wallet.public.address)

const publicHost = process.env.PUBLIC_HOST
if (!publicHost) {
  throw new Error("No PUBLIC_HOST defined in .env")
}

let port = parseInt(process.env.PORT)
if (!port || isNaN(port)) { port = 8000 }

const server = new Network.Server(wallet, publicHost, port, projectRoot + "/web")
const node = new Node(wallet, server, savedTable)

knownServers.forEach(serverInfo => {
  server.connectToWebSocket(serverInfo.host, serverInfo.address)
})

function saveTable() {
  fs.mkdir(projectRoot + "/storage", err => {
    if (err && err.code !== "EEXIST") {
      console.error("Failed to save data", err)
      return
    }
    
    fs.writeFile(projectRoot + "/storage/table.glm", node.table.exportBuffer(), err => {
      if (err) {
        console.error("Failed to save data", err)
      } else {
        console.log("Sucessfully saved new data")
      }
    })
  })
}

let storedServersJsonHash = []
function saveKnownServers() {
  const json = JSON.stringify(server.cachedServers)
  const hash = utils.hash(json)

  if (!utils.Buffer.equal(hash, storedServersJsonHash)) {
    fs.mkdir(projectRoot + "/storage", err => {
      if (err && err.code !== "EEXIST") {
        console.error("Failed to save servers", err)
        return
      }
      
      fs.writeFile(projectRoot + "/storage/servers.json", json, err => {
        if (err) {
          console.error("Failed to save servers", err)
        } else {
          console.log("Sucessfully saved servers")
        }
      })
    })
  }
}

node.on("newtable", saveTable)
node.on("transactioncompleted", saveTable)

server.on("connection", saveKnownServers)