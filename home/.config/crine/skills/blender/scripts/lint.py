import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

GAP = 0.01
MAX_TRIS = 200_000


def bounds():
    corners = [obj.matrix_world @ Vector(corner) for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render for corner in obj.bound_box]
    if not corners:
        return Vector(), 2
    low = Vector(min(corner[axis] for corner in corners) for axis in range(3))
    high = Vector(max(corner[axis] for corner in corners) for axis in range(3))
    return (low + high) / 2, (high - low).length * 1.05


def box(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return Vector(min(corner[axis] for corner in corners) for axis in range(3)), Vector(max(corner[axis] for corner in corners) for axis in range(3))


def gap(first, second):
    return max(max(first[0][axis] - second[1][axis], second[0][axis] - first[1][axis], 0) for axis in range(3))


def points(obj, flip):
    sign = -1 if flip else 1
    return sorted((round(sign * point.x, 3), round(point.y, 3), round(point.z, 3)) for vertex in obj.data.vertices for point in [obj.matrix_world @ vertex.co])


def mirrored(left, right):
    if len(left.data.vertices) == len(right.data.vertices):
        return points(left, True) == points(right, False)
    low, high = box(left)
    low_right, high_right = box(right)
    return (Vector((-high.x, low.y, low.z)) - low_right).length < 1e-3 and (Vector((-low.x, high.y, high.z)) - high_right).length < 1e-3


def faults(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    lines = []
    if not bm.faces:
        lines.append("0 faces")
    loose = sum(1 for vertex in bm.verts if not vertex.link_edges)
    if loose:
        lines.append(f"{loose} loose verts")
    open_edges = sum(1 for edge in bm.edges if not edge.is_manifold)
    if open_edges:
        lines.append(f"{open_edges} non-manifold edges")
    if bm.faces and len(bm.faces) <= MAX_TRIS:
        tree = BVHTree.FromBMesh(bm)
        crossing = set()
        for first, second in tree.overlap(tree):
            if first < second and not {vertex.index for vertex in bm.faces[first].verts} & {vertex.index for vertex in bm.faces[second].verts}:
                crossing.update((first, second))
        if crossing:
            lines.append(f"{len(crossing)} self-intersecting faces")
    bm.free()
    return lines


def check():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]
    boxes = {obj.name: box(obj) for obj in meshes}
    limit = bounds()[1] * GAP
    warnings = []
    for obj in meshes:
        lines = faults(obj)
        if obj.parent and obj.parent.name in boxes:
            distance = gap(boxes[obj.name], boxes[obj.parent.name])
            if distance > limit:
                lines.append(f"floats {distance:.2f}m from {obj.parent.name}")
        elif len(meshes) > 1:
            nearest = min(((gap(boxes[obj.name], boxes[other.name]), other.name) for other in meshes if other is not obj), key=lambda pair: pair[0])
            if nearest[0] > limit:
                lines.append(f"floats {nearest[0]:.2f}m from {nearest[1]}")
        if obj.name.endswith(".R"):
            mate = bpy.data.objects.get(obj.name[:-2] + ".L")
            if mate and mate.type == "MESH" and not mirrored(mate, obj):
                lines.append(f"not mirror of {mate.name}")
        if lines:
            warnings.append(f"{obj.name}: {', '.join(lines)}")
    return warnings
