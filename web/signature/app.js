const { Key } = glimmer

const data = {
  /** @type { glimmer.Key.Private | null } */
  privateKey: null,
  /** @type { glimmer.Key.Public | null } */
  publicKey: null
}

var app = Vue.createApp({
  data() {
    return {
      prvKey: "",
      showPrivate: true,
      pubKey: "",
      message: "",
      signature: "",

      error: null,
      verified: null
    }
  },
  methods: {
    privateKey() {
      if (!this.prvKey) { return null }
      if (data.privateKey == this.prvKey) {
        return data.privateKey
      }

      try {
        data.privateKey = new Key.Private(this.prvKey)
      } catch(err) {
        console.error(err)
        this.error = "private"
        data.privateKey = null
      }

      return data.privateKey
    },
    publicKey() {
      if (data.publicKey == this.pubKey) {
        return data.publicKey
      }

      try {
        data.publicKey = new Key.Public(this.pubKey)
      } catch (err) {
        console.error(err)
        data.publicKey = null
      }

      return data.publicKey
    },
    fillPrvKey() {
      data.privateKey = Key.Private.generate()
      this.prvKey = data.privateKey.toString()
      data.publicKey = data.privateKey.getPublic()
      this.pubKey = data.publicKey.toString()
    },
    fillPubKey() {
      const privateKey = this.privateKey()
      if (privateKey) {
        this.pubKey = privateKey.getPublic().toString()
      }
    },
    signMessage() {
      /** @type { glimmer.Key.Private } */
      const privateKey = this.privateKey()
      if (!privateKey) {
        this.error = "private"
        return
      }

      const sig = privateKey.sign(this.message)
      const charBytes = Array(sig.length)
      sig.forEach((byte, i) => {
        charBytes[i] = String.fromCharCode(byte)
      })
      this.signature = glimmer.utils.Convert.Base58.encode(sig)
    },
    verifySignature() {
      /** @type { glimmer.Key.Public } */
      const publicKey = this.publicKey()
      if (!publicKey) {
        this.error = "public"
        return
      }

      try {
        this.verified = publicKey.verify(this.message, this.signature)
      } catch (err) {
        this.error = "signature"
        console.error(err)
      }
    }
  },
  watch: {
    prvKey() {
      if (this.error === "private") { this.error = null }
    },
    pubKey() {
      if (this.error === "public") { this.error = null }
    },
    message() {
      if (this.verified !== null) { this.verified = null }
    },
    signature() {
      if (this.error === "signature") { this.error = null }
      if (this.verified !== null) { this.verified = null }
    }
  }
}).mount("#app")