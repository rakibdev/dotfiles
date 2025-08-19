class NewTabDB {
  constructor() {
    this.dbName = 'NewTab'
    this.dbVersion = 1
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = event => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  async save(key, value) {
    try {
      const transaction = this.db.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      await store.put({ key, handle: value, name: value.name })
    } catch (error) {}
  }

  async load(key) {
    try {
      const transaction = this.db.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const request = store.get(key)

      return new Promise(resolve => {
        request.onsuccess = () => {
          resolve(request.result)
        }
        request.onerror = () => resolve(null)
      })
    } catch (error) {}
  }

  async delete(key) {
    try {
      const transaction = this.db.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      await store.delete(key)
    } catch (error) {}
  }
}

class WallpaperClock {
  constructor() {
    this.currentDirHandle = null
    this.currentWallpaperUrl = null
    this.surfaceColor = null
    this.database = new NewTabDB()
    this.init()
  }

  async init() {
    this.surfaceColor = getComputedStyle(document.body).getPropertyValue('--surface').trim()
    this.getElements()
    this.setupEventListeners()
    await this.database.init()
    await this.loadSavedDirHandle()
    await this.loadRandomWallpaper()
    this.startClock()
  }

  getElements() {
    this.pickWallpaperButton = document.querySelector('.pick-wallpaper')
    this.timeDisplay = document.querySelector('.time-display')
  }

  setupEventListeners() {
    this.pickWallpaperButton.addEventListener('click', () => this.selectWallpaperFolder())
  }

  startClock() {
    this.updateTime()
    setInterval(() => this.updateTime(), 1000)
  }

  updateTime() {
    const now = new Date()
    const options = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
    const timeString = now.toLocaleTimeString('en-US', options)
    this.timeDisplay.textContent = timeString.replace(' AM', '').replace(' PM', '')
  }

  async loadRandomWallpaper() {
    if ('showDirectoryPicker' in window && this.currentDirHandle) {
      try {
        const wallpapers = await this.getWallpaperFiles(this.currentDirHandle)
        if (wallpapers.length > 0) {
          const randomWallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)]
          const file = await randomWallpaper.getFile()
          const url = URL.createObjectURL(file)

          this.setWallpaper(url)
          return
        }
      } catch (error) {
        this.currentDirHandle = null
        await this.clearSavedDirHandle()
      }
    }

    this.clearWallpaper()
  }

  async selectWallpaperFolder() {
    if ('showDirectoryPicker' in window) {
      const options = {
        id: 'wallpapers',
        mode: 'readwrite',
        startIn: this.currentDirHandle || 'downloads'
      }

      try {
        const dirHandle = await window.showDirectoryPicker(options)
        if (dirHandle) {
          this.currentDirHandle = dirHandle
          await this.saveDirHandle(dirHandle)
          await this.loadRandomWallpaper()
        }
      } catch (error) {}
    }
  }

  async clearSavedDirHandle() {
    await this.database.delete('wallpaperDir')
  }

  getBrightness(r, g, b) {
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255
  }

  adaptGlassToBackground(imageUrl = null) {
    if (imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        canvas.width = img.width
        canvas.height = img.height

        ctx.drawImage(img, 0, 0)

        const centerX = Math.floor(img.width / 2)
        const centerY = Math.floor(img.height / 2)
        const sampleSize = 100

        let totalBrightness = 0
        let sampleCount = 0

        for (let x = centerX - sampleSize / 2; x < centerX + sampleSize / 2; x += 5) {
          for (let y = centerY - sampleSize / 2; y < centerY + sampleSize / 2; y += 5) {
            if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
              const imageData = ctx.getImageData(x, y, 1, 1)
              const [r, g, b] = imageData.data
              totalBrightness += this.getBrightness(r, g, b)
              sampleCount++
            }
          }
        }

        const avgBrightness = totalBrightness / sampleCount

        let lightBg = avgBrightness >= 0.8
        if (lightBg) document.body.classList.add('dark')
        else document.body.classList.remove('dark')
      }
      img.src = imageUrl
    } else {
      const r = parseInt(this.surfaceColor.slice(1, 3), 16)
      const g = parseInt(this.surfaceColor.slice(3, 5), 16)
      const b = parseInt(this.surfaceColor.slice(5, 7), 16)
      const brightness = this.getBrightness(r, g, b)

      let lightBg = brightness >= 0.7
      if (lightBg) document.body.classList.add('dark')
      else document.body.classList.remove('dark')
    }
  }

  async getWallpaperFiles(dirHandle) {
    const wallpapers = []
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']

    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const extension = name.toLowerCase().substring(name.lastIndexOf('.'))
        if (imageExtensions.includes(extension)) wallpapers.push(handle)
      }
    }

    return wallpapers
  }

  async saveDirHandle(dirHandle) {
    await this.database.save('wallpaperDir', dirHandle)
  }

  async loadSavedDirHandle() {
    const result = await this.database.load('wallpaperDir')
    if (result && result.handle) {
      try {
        const permission = await result.handle.queryPermission()
        if (permission === 'granted') {
          this.currentDirHandle = result.handle
        } else {
          await this.clearSavedDirHandle()
        }
      } catch (error) {
        await this.clearSavedDirHandle()
      }
    }
  }

  setWallpaper(url) {
    if (this.currentWallpaperUrl) URL.revokeObjectURL(this.currentWallpaperUrl)

    this.currentWallpaperUrl = url
    document.body.style.backgroundColor = this.surfaceColor
    document.body.style.backgroundImage = `url(${url})`
    document.body.style.backgroundSize = 'cover'
    document.body.style.backgroundPosition = 'center'
    document.body.style.backgroundAttachment = 'fixed'

    this.adaptGlassToBackground(url)
  }

  clearWallpaper() {
    if (this.currentWallpaperUrl) {
      URL.revokeObjectURL(this.currentWallpaperUrl)
      this.currentWallpaperUrl = null
    }

    document.body.style.backgroundColor = this.surfaceColor
    document.body.style.backgroundImage = 'none'
    this.adaptGlassToBackground()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WallpaperClock()
})
