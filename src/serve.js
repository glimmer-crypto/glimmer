require("dotenv").config()
const fs = require("fs")

const { CoinTable, Wallet, Node, Key, Network, utils } = require("../coin-table/dist")
require("./initialize")

/** @type { Wallet } */
let wallet
try {
  wallet = Wallet.importJSON(process.env.WALLET)
} catch (err) {
  wallet = Wallet.generate()

  try {
    const env = fs.readFileSync(__dirname + "/../.env").toString()
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
    fs.writeFileSync(__dirname + "/../.env", newEnvLines.join("\n"))
  } catch (err) {
    console.error(err)
  }
}

console.log("Wallet: ", wallet.public.address)

const publicHost = process.env.PUBLIC_HOST
if (publicHost) {
  const port = process.env.PORT || 8000

  const server = new Network.Server(wallet, publicHost, port, __dirname + "/../web")
  const node = new Node(wallet, server)
} else {
  console.error("No PUBLIC_HOST defined in .env")
}

