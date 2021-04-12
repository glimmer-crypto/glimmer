{
  /**
   * @param { IDBRequest } request
   * @returns { Promise }
   */
  function idbPromise(request) {
    return new Promise((resolve, reject) => {
      try {
        if (request.result) {
          resolve(request.result)
          return
        } else if (request.error) {
          reject(request.error)
          return
        }
      } catch { /* Request is still pending */ }
      

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * @param { AsyncStorage } storage
   */
  function checkOpen(storage) {
    if (!storage.opened) {
      throw new Error(`Storage "${storage.name}" not opened, call .open()`)
    }
  }

  var AsyncStorage = class {
    constructor(name) {
      this.opened = false
      this.name = name
    }
  
    async open() {
      const request = indexedDB.open(this.name)
      request.onupgradeneeded = () => {
        const db = request.result

        db.createObjectStore("storage")
      }

      /** @type { IDBDatabase } */
      this.db = await idbPromise(request)

      this.opened = true
    }

    async getItem(key) {
      checkOpen(this)

      const transaction = this.db.transaction("storage", "readonly")
      const store = transaction.objectStore("storage")

      const result = await idbPromise(store.get(key))
      if (result) {
        return result
      } else {
        return null
      }
    }

    async setItem(key, value) {
      checkOpen(this)

      const transaction = this.db.transaction("storage", "readwrite")
      const store = transaction.objectStore("storage")

      await idbPromise(store.put(value, key))
    }

    async removeItem(key) {
      checkOpen(this)

      const transaction = this.db.transaction("storage", "readwrite")
      const store = transaction.objectStore("storage")

      await idbPromise(store.delete(key))
    }
  }
}
