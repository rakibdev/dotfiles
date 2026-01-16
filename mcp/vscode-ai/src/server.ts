import { existsSync, unlinkSync } from 'fs'
import { createServer, Server, Socket } from 'net'

export type Request = {
  id: string
  method: string
  params?: Record<string, unknown>
}

export type Response = {
  id: string
  result?: unknown
  error?: { code: number; message: string }
}

export type Handler = (req: Request) => Promise<Response>

export class SocketServer {
  private server: Server | null = null
  private socketPath: string = ''

  constructor(private handler: Handler) {}

  start(socketPath: string) {
    this.socketPath = socketPath
    if (existsSync(this.socketPath)) unlinkSync(this.socketPath)

    return new Promise<void>((resolve, reject) => {
      this.server = createServer(socket => this.onConnection(socket))
      this.server.on('error', reject)
      this.server.listen(this.socketPath, resolve)
    })
  }

  getPath() {
    return this.socketPath
  }

  private onConnection(socket: Socket) {
    let buffer = ''
    socket.on('data', data => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const req: Request = JSON.parse(line)
          this.handler(req).then(res => socket.write(JSON.stringify(res) + '\n'))
        } catch (e: any) {
          socket.write(JSON.stringify({ id: 'unknown', error: { code: 500, message: e.message } }) + '\n')
        }
      }
    })
  }

  cleanup() {
    this.server?.close()
    if (this.socketPath && existsSync(this.socketPath)) unlinkSync(this.socketPath)
  }
}
