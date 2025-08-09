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

class FocusTimer {
  constructor() {
    this.isRunning = false
    this.timeLeft = 0
    this.totalTime = 0
    this.interval = null
    this.defaultTime = '20:00'
    this.currentDirHandle = null
    this.currentWallpaperUrl = null
    this.surfaceColor = null
    this.database = new NewTabDB()
    this.init()
  }

  async init() {
    this.surfaceColor = getComputedStyle(document.body).getPropertyValue('--surface-color').trim()
    this.getElements()
    this.setupEventListeners()
    this.loadSavedTime()
    await this.database.init()
    await this.loadSavedDirHandle()
    await this.loadRandomWallpaper()
  }

  getElements() {
    this.pickWallpaperButton = document.querySelector('.pick-wallpaper')
    this.timeDisplay = document.querySelector('.time-display')
    this.startTimerButton = document.querySelector('.start-timer')
    this.playIcon = document.querySelector('.start-timer .icon')
  }

  setupEventListeners() {
    this.timeDisplay.addEventListener('click', () => this.editTime())
    this.startTimerButton.addEventListener('click', () => this.toggleTimer())
    this.pickWallpaperButton.addEventListener('click', () => this.selectWallpaperFolder())
  }

  editTime() {
    if (this.isRunning) return

    const input = document.createElement('input')
    input.className = 'time-display editing'
    input.type = 'text'
    input.value = this.timeDisplay.textContent || this.defaultTime
    input.pattern = '[0-9]{1,2}:[0-9]{2}'
    input.placeholder = 'MM:SS'

    this.timeDisplay.replaceWith(input)
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)

    const finishEdit = () => {
      const value = input.value.trim()
      const timeRegex = /^(\d{1,2}):(\d{2})$/
      const match = value.match(timeRegex)

      if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        if (minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59) {
          const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          this.timeDisplay.textContent = formattedTime
          this.saveTime(formattedTime)
        } else this.timeDisplay.textContent = this.defaultTime
      } else this.timeDisplay.textContent = this.timeDisplay.textContent || this.defaultTime

      input.replaceWith(this.timeDisplay)
    }

    input.addEventListener('blur', finishEdit)
    input.addEventListener('keydown', event => {
      if (event.key == 'Enter') finishEdit()
      else if (event.key == 'Escape') input.replaceWith(this.timeDisplay)
    })
  }

  toggleTimer() {
    if (this.isRunning) this.stopTimer()
    else this.startTimer()
  }

  startTimer() {
    const timeText = this.timeDisplay.textContent || this.defaultTime
    const [minutes, seconds] = timeText.split(':').map(Number)
    this.totalTime = minutes * 60 + seconds
    this.timeLeft = this.totalTime

    if (this.timeLeft <= 0) return

    this.isRunning = true
    this.startTimerButton.classList.add('running')
    this.updatePlayIcon()

    this.interval = setInterval(() => {
      this.timeLeft--
      this.updateDisplay()

      if (this.timeLeft <= 0) this.onTimerComplete()
    }, 1000)
  }

  stopTimer() {
    this.isRunning = false
    this.startTimerButton.classList.remove('running')

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    this.updatePlayIcon()
    this.resetDisplay()
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60)
    const seconds = this.timeLeft % 60
    this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  resetDisplay() {
    const savedTime = localStorage.getItem('focusTime') || this.defaultTime
    this.timeDisplay.textContent = savedTime
  }

  updatePlayIcon() {
    if (this.isRunning) {
      this.playIcon.src = 'images/restart.svg'
      this.playIcon.alt = 'Reset'
    } else {
      this.playIcon.src = 'images/play.svg'
      this.playIcon.alt = 'Play'
    }
  }

  onTimerComplete() {
    this.stopTimer()
    this.sendSystemNotification('Focus Timer', 'Your focus session has ended!')
  }

  sendSystemNotification(title, body) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') new Notification(title, { body, icon: 'images/play.svg' })
      else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') new Notification(title, { body, icon: 'images/play.svg' })
        })
      }
    }
  }

  saveTime(time) {
    localStorage.setItem('focusTime', time)
  }

  loadSavedTime() {
    const savedTime = localStorage.getItem('focusTime')
    if (savedTime) this.timeDisplay.textContent = savedTime
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

        let lightBg = avgBrightness >= 0.7
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
  new FocusTimer()
})
