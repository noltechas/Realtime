// Raw-sample capture on an AudioWorklet.
//
// ScriptProcessorNode crashes the renderer outright in this Electron (28.3.3 on
// macOS 26): an oscillator into a ScriptProcessor is enough, no mic needed. So
// every "give me the samples" tap (voice check, dry performance takes) goes
// through this node instead. It has no outputs, so it runs without being wired
// to the destination, and posts mono chunks of `chunk` frames from one input
// channel (for multi-channel interfaces) to the main thread.

const CAPTURE_PROCESSOR_CODE = `
class RkCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const o = (options && options.processorOptions) || {}
    this.channel = o.channel || 0
    this.size = o.chunk || 4096
    this.buf = new Float32Array(this.size)
    this.n = 0
  }
  process(inputs) {
    const input = inputs[0]
    if (input && input.length) {
      const ch = input[Math.min(this.channel, input.length - 1)]
      let i = 0
      while (i < ch.length) {
        const take = Math.min(ch.length - i, this.size - this.n)
        this.buf.set(ch.subarray(i, i + take), this.n)
        this.n += take
        i += take
        if (this.n === this.size) {
          this.port.postMessage(this.buf, [this.buf.buffer])
          this.buf = new Float32Array(this.size)
          this.n = 0
        }
      }
    }
    return true
  }
}
registerProcessor('rk-capture', RkCaptureProcessor)
`

const loaded = new WeakMap<BaseAudioContext, Promise<void>>()

/** A sink node that hands `onChunk` each `chunk` frames of one channel of whatever is connected to it. */
export async function createCaptureNode(
    ctx: AudioContext,
    onChunk: (samples: Float32Array) => void,
    opts: { channel?: number; chunk?: number } = {},
): Promise<AudioWorkletNode> {
    let ready = loaded.get(ctx)
    if (!ready) {
        const url = URL.createObjectURL(new Blob([CAPTURE_PROCESSOR_CODE], { type: 'application/javascript' }))
        ready = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url))
        loaded.set(ctx, ready)
    }
    await ready
    const node = new AudioWorkletNode(ctx, 'rk-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        processorOptions: { channel: opts.channel ?? 0, chunk: opts.chunk ?? 4096 },
    })
    node.port.onmessage = (e: MessageEvent<Float32Array>) => onChunk(e.data)
    return node
}
