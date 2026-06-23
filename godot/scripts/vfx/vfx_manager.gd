class_name VFXManager
extends Node3D

## Manages all visual effects: explosions, status particles, skill FX

func emit_explosion(pos: Vector3, radius: float = 3.0, color: Color = Color(1, 0.6, 0.2)) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = radius * 0.3
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = radius * 2.0
	mat.initial_velocity_max = radius * 4.0
	mat.gravity = Vector3(0, -8, 0)
	mat.scale_min = 0.3
	mat.scale_max = 0.8
	mat.color = color
	particles.process_material = mat
	particles.amount = 24
	particles.lifetime = 0.6
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.emitting = true
	particles.position = pos

	# Mesh for each particle
	var mesh := SphereMesh.new()
	mesh.radius = 0.15
	mesh.height = 0.3
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = color
	mesh_mat.emission_enabled = true
	mesh_mat.emission = color
	mesh_mat.emission_energy_multiplier = 4.0
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 1.5)

func emit_shield(pos: Vector3) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = 1.5
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 60.0
	mat.initial_velocity_min = 2.0
	mat.initial_velocity_max = 4.0
	mat.gravity = Vector3.ZERO
	mat.color = Color(0.3, 0.6, 1.0, 0.7)
	particles.process_material = mat
	particles.amount = 16
	particles.lifetime = 0.8
	particles.one_shot = true
	particles.explosiveness = 0.8
	particles.emitting = true
	particles.position = pos

	var mesh := SphereMesh.new()
	mesh.radius = 0.08
	mesh.height = 0.16
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = Color(0.3, 0.6, 1.0)
	mesh_mat.emission_enabled = true
	mesh_mat.emission = Color(0.4, 0.7, 1.0)
	mesh_mat.emission_energy_multiplier = 3.0
	mesh_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 1.5)

func emit_lightning(pos: Vector3) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	mat.emission_box_extents = Vector3(0.3, 5.0, 0.3)
	mat.direction = Vector3(0, -1, 0)
	mat.spread = 15.0
	mat.initial_velocity_min = 10.0
	mat.initial_velocity_max = 20.0
	mat.gravity = Vector3(0, -5, 0)
	mat.color = Color(0.9, 0.9, 0.3)
	particles.process_material = mat
	particles.amount = 20
	particles.lifetime = 0.3
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.emitting = true
	particles.position = pos + Vector3(0, 8, 0)

	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.05, 0.4, 0.05)
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = Color(1.0, 1.0, 0.5)
	mesh_mat.emission_enabled = true
	mesh_mat.emission = Color(1.0, 1.0, 0.3)
	mesh_mat.emission_energy_multiplier = 8.0
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 0.8)

func emit_frost_nova(pos: Vector3, radius: float) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	mat.emission_ring_radius = radius
	mat.emission_ring_inner_radius = radius * 0.3
	mat.emission_ring_height = 0.5
	mat.emission_ring_axis = Vector3(0, 1, 0)
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 45.0
	mat.initial_velocity_min = 1.0
	mat.initial_velocity_max = 3.0
	mat.gravity = Vector3(0, -2, 0)
	mat.color = Color(0.5, 0.8, 1.0, 0.8)
	particles.process_material = mat
	particles.amount = 40
	particles.lifetime = 1.0
	particles.one_shot = true
	particles.explosiveness = 0.9
	particles.emitting = true
	particles.position = pos

	var mesh := SphereMesh.new()
	mesh.radius = 0.1
	mesh.height = 0.2
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = Color(0.6, 0.85, 1.0)
	mesh_mat.emission_enabled = true
	mesh_mat.emission = Color(0.5, 0.8, 1.0)
	mesh_mat.emission_energy_multiplier = 2.0
	mesh_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 2.0)

func emit_flame(pos: Vector3, dir: Vector3, range_val: float) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	mat.emission_box_extents = Vector3(1.0, 0.5, range_val * 0.5)
	mat.direction = dir
	mat.spread = 20.0
	mat.initial_velocity_min = range_val
	mat.initial_velocity_max = range_val * 1.5
	mat.gravity = Vector3(0, 2, 0)
	mat.scale_min = 0.5
	mat.scale_max = 1.5
	mat.color = Color(1.0, 0.5, 0.1, 0.8)
	particles.process_material = mat
	particles.amount = 30
	particles.lifetime = 0.5
	particles.one_shot = true
	particles.explosiveness = 0.7
	particles.emitting = true
	particles.position = pos

	var mesh := SphereMesh.new()
	mesh.radius = 0.2
	mesh.height = 0.4
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = Color(1.0, 0.4, 0.1)
	mesh_mat.emission_enabled = true
	mesh_mat.emission = Color(1.0, 0.3, 0.0)
	mesh_mat.emission_energy_multiplier = 5.0
	mesh_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 1.0)

func emit_shockwave(pos: Vector3, radius: float) -> void:
	emit_explosion(pos, radius, Color(0.8, 0.6, 0.3))

func emit_whirlwind(pos: Vector3, radius: float) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	mat.emission_ring_radius = radius
	mat.emission_ring_inner_radius = 0.5
	mat.emission_ring_height = 1.0
	mat.emission_ring_axis = Vector3(0, 1, 0)
	mat.direction = Vector3(0, 0.5, 0)
	mat.spread = 30.0
	mat.initial_velocity_min = 3.0
	mat.initial_velocity_max = 6.0
	mat.gravity = Vector3.ZERO
	mat.color = Color(0.7, 0.7, 0.7, 0.6)
	mat.angular_velocity_min = 200.0
	mat.angular_velocity_max = 400.0
	particles.process_material = mat
	particles.amount = 20
	particles.lifetime = 0.6
	particles.one_shot = true
	particles.explosiveness = 0.6
	particles.emitting = true
	particles.position = pos

	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.3, 0.05, 0.1)
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = Color(0.8, 0.8, 0.8)
	mesh_mat.emission_enabled = true
	mesh_mat.emission = Color(0.7, 0.7, 0.7)
	mesh_mat.emission_energy_multiplier = 1.5
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 1.2)

func emit_time_warp(pos: Vector3, radius: float) -> void:
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	mat.emission_ring_radius = radius
	mat.emission_ring_inner_radius = 0
	mat.emission_ring_height = 3.0
	mat.emission_ring_axis = Vector3(0, 1, 0)
	mat.direction = Vector3(0, 0, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 0.5
	mat.initial_velocity_max = 1.5
	mat.gravity = Vector3.ZERO
	mat.color = Color(0.5, 0.3, 0.8, 0.5)
	particles.process_material = mat
	particles.amount = 50
	particles.lifetime = 2.0
	particles.one_shot = true
	particles.emitting = true
	particles.position = pos

	var mesh := SphereMesh.new()
	mesh.radius = 0.06
	mesh.height = 0.12
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = Color(0.6, 0.4, 1.0)
	mesh_mat.emission_enabled = true
	mesh_mat.emission = Color(0.5, 0.3, 0.9)
	mesh_mat.emission_energy_multiplier = 3.0
	mesh_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 3.0)

func emit_hit(pos: Vector3, is_crit: bool = false) -> void:
	var color := Color(1, 1, 0.3) if is_crit else Color(1, 0.8, 0.5)
	var particles := GPUParticles3D.new()
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = 0.3
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 90.0
	mat.initial_velocity_min = 3.0
	mat.initial_velocity_max = 6.0
	mat.gravity = Vector3(0, -10, 0)
	mat.color = color
	particles.process_material = mat
	particles.amount = 8 if not is_crit else 16
	particles.lifetime = 0.3
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.emitting = true
	particles.position = pos

	var mesh := SphereMesh.new()
	mesh.radius = 0.05
	mesh.height = 0.1
	var mesh_mat := StandardMaterial3D.new()
	mesh_mat.albedo_color = color
	mesh_mat.emission_enabled = true
	mesh_mat.emission = color
	mesh_mat.emission_energy_multiplier = 4.0
	mesh.material = mesh_mat
	particles.draw_pass_1 = mesh

	add_child(particles)
	_auto_free(particles, 0.8)

func _auto_free(node: Node, delay: float) -> void:
	var timer := get_tree().create_timer(delay)
	timer.timeout.connect(func(): if is_instance_valid(node): node.queue_free())
