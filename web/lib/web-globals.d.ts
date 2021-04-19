import { CoinTable, Wallet, Node, Network, Key, utils } from "../../coin-table/lib"

type CoinTablePackage = {
  CoinTable: typeof CoinTable,
  Wallet: typeof Wallet,
  Node: typeof Node,
  Key: typeof Key,
  Network: Omit<typeof Network, "Server">
  utils: typeof utils
}

type _cointable = CoinTable
type _node = Node

type _wallet = Wallet
type _wallet_wordlist = Wallet.WordList

type _key_public = Key.Public
type _key_private = Key.Private

type _network_local = Network.Local
type _network_client = Network.Client

type _utils_bn = utils.BN

declare global {
  interface Window {
    glimmer: CoinTablePackage
  }

  const glimmer: CoinTablePackage

  namespace glimmer {
    type CoinTable = _cointable
    type Node = _node

    type Wallet = _wallet
    namespace Wallet {
      type WordList = _wallet_wordlist
    }

    namespace Key {
      type Public = _key_public
      type Private = _key_private
    }

    namespace Network {
      type Local = _network_local
      type Client = _network_client
    }

    namespace utils {
      type BN = _utils_bn
    }
  }
}