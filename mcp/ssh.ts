#!/usr/bin/env bun
import { spawn, type Subprocess } from "bun"

const { SSH_HOST, SSH_USER, SSH_PASSWORD } = Bun.env
const SSH_PORT = Bun.env.SSH_PORT || "22"
if (!SSH_HOST || !SSH_USER) throw new Error("SSH_HOST and SSH_USER required")

const MAX_OUTPUT = 30_000

type Handler = (params: Record<string, unknown>) => Promise<unknown>

const tools: Record<string, { description: string; inputSchema: object; handler: Handler }> = {
  exec: {
    description: "Execute command on remote SSH server",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string", description: "Shell command to execute" } },
      required: ["command"],
    },
    handler: async ({ command }) => {
      let result = await exec(command as string)
      if (result.length > MAX_OUTPUT) result = result.slice(0, MAX_OUTPUT) + `\n...more ${result.length - MAX_OUTPUT} chars`
      return { content: [{ type: "text", text: result }] }
    },
  },
}

let sshProcess: Subprocess | null = null
let requestId = 0
const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>()
let buffer = ""
const decoder = new TextDecoder()

const marker = (id: number, type: "S" | "E") => `__SSH_MCP_${type}_${id}__`

const connectSSH = () => {
  if (sshProcess) return

  const sshArgs = ["-tt", "-o", "StrictHostKeyChecking=no", "-p", SSH_PORT, `${SSH_USER}@${SSH_HOST}`]

  sshProcess = spawn(SSH_PASSWORD ? ["sshpass", "-e", "ssh", ...sshArgs] : ["ssh", ...sshArgs], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, SSHPASS: SSH_PASSWORD },
  })

  ;(async () => {
    for await (const chunk of sshProcess!.stdout) {
      buffer += decoder.decode(chunk)
      let minEnd = buffer.length
      for (const [id, { resolve }] of pending) {
        const startMark = marker(id, "S")
        const endMark = marker(id, "E")
        const start = buffer.indexOf(startMark)
        const end = buffer.indexOf(endMark)
        if (start != -1 && end != -1) {
          resolve(buffer.slice(start + startMark.length, end).trim())
          pending.delete(id)
          minEnd = Math.min(minEnd, end + endMark.length)
        }
      }
      if (minEnd < buffer.length) buffer = buffer.slice(minEnd)
      else if (!pending.size) buffer = ""
    }
  })()

  sshProcess.exited.then(() => {
    sshProcess = null
    for (const { reject } of pending.values()) reject(new Error("SSH disconnected"))
    pending.clear()
  })
}

const exec = (command: string) => {
  connectSSH()
  const id = ++requestId
  sshProcess!.stdin.write(`stty -echo 2>/dev/null; echo ${marker(id, "S")}; ${command}; echo ${marker(id, "E")}\n`)

  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error("Command timeout"))
    }, 60000)
  })
}

const send = (msg: object) => process.stdout.write(JSON.stringify(msg) + "\n")

const handleMessage = async (msg: { id?: number; method: string; params?: Record<string, unknown> }) => {
  const { id, method, params } = msg

  if (method == "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-03-26",
        serverInfo: { name: "ssh-mcp", version: "1.0.0" },
        capabilities: { tools: {} },
      },
    })
  } else if (method == "notifications/initialized") {
  } else if (method == "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: Object.entries(tools).map(([name, { description, inputSchema }]) => ({
          name,
          description,
          inputSchema,
        })),
      },
    })
  } else if (method == "tools/call") {
    const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> }
    const tool = tools[name]
    if (!tool) {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${name}` } })
      return
    }
    try {
      const result = await tool.handler(args)
      send({ jsonrpc: "2.0", id, result })
    } catch (error: any) {
      send({ jsonrpc: "2.0", id, error: { code: -32000, message: error.message } })
    }
  } else {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } })
  }
}

let inputBuffer = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk: string) => {
  inputBuffer += chunk
  const lines = inputBuffer.split("\n")
  inputBuffer = lines.pop()!
  for (const line of lines) {
    if (line.trim()) handleMessage(JSON.parse(line))
  }
})

const cleanup = () => {
  sshProcess?.kill()
  process.exit(0)
}

process.stdin.on("close", cleanup)
process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)
process.on("exit", () => sshProcess?.kill())
