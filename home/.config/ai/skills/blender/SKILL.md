---
name: blender
description: 3D modeling, mesh editing and export in Blender
---

Start daemon:
```bash
bash $scripts/start.sh
```

## Scripting

`bpy` `bmesh` `math` `mathutils` `Vector` already loaded, no need to `import` them, plus:

- `list_objects()` one line per object: type, dims, loc, evaluated vert/tri counts, materials, modifiers
- `info(name)` single object: scale, rotation, uv layers, vertex groups, shape keys, bones, material nodes

`list_objects`, `info` return plain lists, so filter them `print([o for o in list_objects() if 'hidden' in o])`

```py
python3 scripts/run.py 'list_objects()'
```

- Scene state, variables and imports persist between calls
- Batch statements into single call

## Notes
- Never save file unless asked

## Docs

- `docs/vrm.md` VRM import, humanoid bones, MToon, expressions, spring bones, export
