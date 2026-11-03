import ast
import bmesh
import bpy
import io
import json
import math
import mathutils
import numpy
import os
import socket
import sys
import traceback
from contextlib import redirect_stdout
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lint import bounds, check

RUNTIME = f"{os.environ['XDG_RUNTIME_DIR']}/blender-skill"
SOCKET_PATH = f"{RUNTIME}/sock"
SNAP_PATH = "/tmp/snap.png"
SIZE = 512
NOISE = ("INFO ", "| INFO:", "Extracting primitive", "Primitives created")
VIEWS = {"front": Vector((0, -1, 0)), "right": Vector((1, 0, 0)), "top": Vector((0, 0, 1)), "iso": Vector((1, -1, 1))}

dirty = False


class Rows(list):
    def __str__(self):
        return "\n".join(str(row) for row in self)


def summarize(obj, depsgraph):
    dimensions = tuple(round(value, 3) for value in obj.dimensions)
    location = tuple(round(value, 3) for value in obj.location)
    line = f"{obj.name} {obj.type.lower()} dim{dimensions} loc{location}"
    if obj.type == "MESH":
        mesh = obj.evaluated_get(depsgraph).data
        triangles = len(mesh.loop_triangles) or sum(len(polygon.vertices) - 2 for polygon in mesh.polygons)
        line += f" v{len(mesh.vertices)} t{triangles}"
        if obj.data.materials:
            line += " mat:" + ",".join(material.name for material in obj.data.materials if material)
        if obj.modifiers:
            line += " mod:" + ",".join(modifier.type.lower() for modifier in obj.modifiers)
        if obj.data.shape_keys:
            line += f" shape{len(obj.data.shape_keys.key_blocks)}"
    if obj.type == "ARMATURE":
        line += f" bones{len(obj.data.bones)}"
    if obj.parent:
        line += f" parent:{obj.parent.name}"
    if obj.hide_render:
        line += " hidden"
    return line


def scan(name=None):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    if name is None:
        return Rows(summarize(obj, depsgraph) for obj in bpy.context.scene.objects)
    obj = bpy.data.objects[name]
    rows = Rows([summarize(obj, depsgraph)])
    rows.append("scale" + str(tuple(round(value, 3) for value in obj.scale)))
    rows.append("rotation" + str(tuple(round(math.degrees(value), 1) for value in obj.rotation_euler)))
    if obj.children:
        rows.append("children:" + ",".join(child.name for child in obj.children))
    if obj.type == "MESH":
        mesh = obj.data
        rows.append(f"uv:{','.join(layer.name for layer in mesh.uv_layers) or 'none'}")
        if obj.vertex_groups:
            rows.append("groups:" + ",".join(group.name for group in obj.vertex_groups))
        if mesh.shape_keys:
            rows.append("keys:" + ",".join(key.name for key in mesh.shape_keys.key_blocks))
        for modifier in obj.modifiers:
            rows.append(f"mod {modifier.name} {modifier.type.lower()} show_viewport={modifier.show_viewport}")
        for material in mesh.materials:
            if material:
                nodes = ",".join(node.type.lower() for node in material.node_tree.nodes) if material.use_nodes else "flat"
                rows.append(f"mat {material.name} {nodes}")
    if obj.type == "ARMATURE":
        for bone in obj.data.bones:
            rows.append(f"bone {bone.name} parent:{bone.parent.name if bone.parent else '-'} len{round(bone.length, 3)}")
    return rows


def undo():
    bpy.ops.ed.undo()


def render(camera, center, scale, direction, path):
    camera.location = center + direction.normalized() * scale * 4
    camera.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    camera.data.ortho_scale = scale
    camera.data.clip_end = scale * 10
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(path)
    pixels = numpy.empty(SIZE * SIZE * 4, numpy.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(SIZE, SIZE, 4)


def grid():
    scene = bpy.context.scene
    data = bpy.data.cameras.new("_snap")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("_snap", data)
    scene.collection.objects.link(camera)
    previous = scene.camera, scene.render.engine, scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage, scene.render.filepath
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.display.shading.show_object_outline = True
    scene.display.shading.show_cavity = True
    center, scale = bounds()
    tiles = [render(camera, center, scale, direction, f"{RUNTIME}/{name}.png") for name, direction in VIEWS.items()]
    grid = numpy.concatenate([numpy.concatenate(tiles[2:], axis=1), numpy.concatenate(tiles[:2], axis=1)])
    image = bpy.data.images.new("_snap", SIZE * 2, SIZE * 2)
    image.pixels.foreach_set(grid.ravel())
    image.filepath_raw = SNAP_PATH
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)
    scene.camera, scene.render.engine, scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage, scene.render.filepath = previous
    bpy.data.objects.remove(camera)
    bpy.data.cameras.remove(data)


def shoot():
    render = bpy.context.scene.render
    previous = render.filepath, render.resolution_percentage, render.image_settings.file_format
    render.filepath = SNAP_PATH
    render.resolution_percentage = 50
    render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    render.filepath, render.resolution_percentage, render.image_settings.file_format = previous


def snap():
    if bpy.context.scene.camera:
        shoot()
    else:
        grid()


def mark(scene, depsgraph):
    global dirty
    dirty = True


namespace = {
    "bpy": bpy,
    "bmesh": bmesh,
    "math": math,
    "mathutils": mathutils,
    "Vector": Vector,
    "scan": scan,
    "undo": undo,
}


def trim(text):
    lines = [line for line in text.splitlines() if line.strip() and not any(mark in line for mark in NOISE)]
    return "\n".join(lines)


def evaluate(code):
    tree = ast.parse(code)
    tail = tree.body.pop() if tree.body and isinstance(tree.body[-1], ast.Expr) else None
    exec(compile(tree, "<ai>", "exec"), namespace)
    if tail is None:
        return None
    return eval(compile(ast.Expression(tail.value), "<ai>", "eval"), namespace)


def run(code):
    global dirty
    if not code.strip():
        return ""
    buffer = io.StringIO()
    bpy.ops.ed.undo_push(message=code.strip()[:40])
    dirty = False
    try:
        with redirect_stdout(buffer):
            value = evaluate(code)
            bpy.context.view_layer.update()
    except Exception:
        kind, error, trace = sys.exc_info()
        while trace and trace.tb_frame.f_code.co_filename != "<ai>":
            trace = trace.tb_next
        return "".join(traceback.format_exception(kind, error, trace)).strip()
    printed = buffer.getvalue()
    if value is not None and value != {"FINISHED"}:
        printed += f"\n{value!r}"
    if dirty:
        with redirect_stdout(io.StringIO()):
            snap()
        printed += "".join(f"\n⚠ {warning}" for warning in check())
    return trim(printed)


def receive(client):
    data = b""
    while not data.endswith(b"\n"):
        data += client.recv(65536)
    return json.loads(data)["code"]


def reply(client, output):
    client.sendall(json.dumps({"out": output}).encode() + b"\n")
    client.close()


os.makedirs(RUNTIME, exist_ok=True)
if os.path.exists(SOCKET_PATH):
    os.remove(SOCKET_PATH)
server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
server.bind(SOCKET_PATH)
server.listen(4)
bpy.app.handlers.depsgraph_update_post.append(mark)
print("READY", bpy.app.version_string, flush=True)

while True:
    client, _ = server.accept()
    code = receive(client)
    try:
        reply(client, run(code))
    except Exception as error:
        reply(client, str(error))
