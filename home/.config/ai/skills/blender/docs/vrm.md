# VRM

The VRM add-on (`bl_ext.blender_org.vrm`, 4.7.1) is enabled by daemon.py at boot. Spec defaults
to VRM 1.0, so use the `vrm1` property tree and the `vrm1` operators. The `vrm0` twins exist for
legacy files only.

## Import

```python
bpy.ops.import_scene.vrm(filepath="/path/a.vrm", extract_textures_into_folder=False)
bpy.ops.import_scene.vrma(filepath="/path/a.vrma", armature_object_name="Armature")
```

## Validate before exporting

`bpy.ops.vrm.model_validate` keeps its findings in operator-local state, unreachable afterwards.
Grab them yourself, imports/vars persist so only do the setup once per session:

```python
from bl_ext.blender_org.vrm.editor.validation import VrmValidationError, WM_OT_vrm_validator

class ValidationBox(bpy.types.PropertyGroup):
    errors: bpy.props.CollectionProperty(type=VrmValidationError)

bpy.utils.register_class(ValidationBox)
bpy.types.WindowManager.vrm_validation_box = bpy.props.PointerProperty(type=ValidationBox)

def vrm_check(armature_name):
    box = bpy.context.window_manager.vrm_validation_box
    WM_OT_vrm_validator.detect_errors(bpy.context, box.errors, armature_name)
    return [(e.severity, e.message) for e in box.errors]
```

```python
print([m for s, m in vrm_check("Armature") if s == 0])
```

Severity `0` blocks export and silently returns `{'CANCELLED'}`. `ignore_warning=True` skips warnings.

## Humanoid bones

Auto assignment matches bone hierarchy:

```python
bpy.ops.vrm.assign_vrm1_humanoid_human_bones_automatically(armature_object_name="Armature")
```

Manual override, one bone at a time:

```python
bones = armature.data.vrm_addon_extension.vrm1.humanoid.human_bones
bones.hips.node.bone_name = "hips"
```

`bpy.ops.vrm.make_estimated_humanoid_t_pose(armature_object_name=...)` forces a T-pose.

## Materials

VRM shading is MToon. Convert per material:

```python
bpy.ops.vrm.convert_material_to_mtoon1(material_name="Skin")
bpy.ops.vrm.convert_mtoon1_to_bsdf_principled(material_name="Skin")   # back for editing
```

## Expressions

Auto-bind shape keys:

```python
bpy.ops.vrm.assign_vrm1_expressions_automatically(armature_object_name="Armature")
bpy.ops.vrm.assign_vrm1_expressions_from_vrchat(armature_object_name="Armature")
bpy.ops.vrm.assign_vrm1_expressions_from_arkit(armature_object_name="Armature")
bpy.ops.vrm.assign_vrm1_expressions_from_mmd(armature_object_name="Armature")
```

## Spring bones

```python
bpy.ops.vrm.assign_spring_bone1_automatically(armature_object_name="Armature")
springs = armature.data.vrm_addon_extension.spring_bone1.springs
```

Colliders and joints: `add_spring_bone1_collider`, `add_spring_bone1_collider_group`, `add_spring_bone1_spring_joint`.

## Meta

```python
meta = armature.data.vrm_addon_extension.vrm1.meta
meta.vrm_name = "Alice"
bpy.ops.vrm.add_vrm1_meta_author(armature_object_name="Armature")
meta.authors[0].value = "rakib"
```

## Export

```python
bpy.ops.export_scene.vrm(filepath="/path/out.vrm", armature_object_name="Armature")
```

`WARNING: <mesh> has no skin` means the mesh has no armature deform, it still exports.
