const OPENCODE_GO_URL = 'opencode.ai/zen/go'

const patchStream = (body: ReadableStream<Uint8Array>) =>
  body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream({
      transform(chunk, ctrl) {
        ctrl.enqueue(chunk.replaceAll('cache_creation_input_tokens', 'cache_write_tokens'))
      }
    }))
    .pipeThrough(new TextEncoderStream())

const orig = globalThis.fetch
globalThis.fetch = async (url, init) => {
  const res = await orig(url, init)
  if (!res.body || !url?.toString().includes(OPENCODE_GO_URL)) return res
  return new Response(patchStream(res.body), { status: res.status, statusText: res.statusText, headers: res.headers })
}
