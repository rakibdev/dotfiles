---
name: explain
---
Explain how code works, local or GitHub repo:
- File tree + inline summary per file
- Architecture and execution steps with input + output data examples; quote magic lines from code
- Explicit reference: "UserHandler in handlers/user.go" not "the handler"

Example:
User: how does it use so low RAM?
```
Renders on CPU, not GPU.

src/
  main.rs        creates window, picks renderer
  render/cpu.rs  draws pixels into framebuffer via tiny-skia
  render/gpu.rs  wgpu renderer, unused by default

1. `main` in main.rs registers CPU renderer
   `let renderer = CpuRenderer::new(&window);`  ← GPU path never initialized
2. `CpuRenderer::draw` in render/cpu.rs paints into one buffer
   in: 800x600 window
   `let pixmap = Pixmap::new(width, height);`  ← one 1.9MB buffer, reused every frame
   out: frame copied to window via softbuffer
```
