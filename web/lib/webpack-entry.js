const { CoinTable, Wallet, Node, Key, Network, utils } = require("../../coin-table/dist")

require("../../src/initialize")

self.glimmer = {
  CoinTable, Wallet, Node, Key, utils,
  Network: {
    prototype: Network.prototype,
    Local: Network.Local,
    Client: Network.Client
  }
}