class_name ArenaBuilder
extends Node3D

## Builds the 3D arena environment with textured PBR materials

const ARENA_RADIUS := 30.0
const PLAY_BOUNDS := 27.0

var _env_node: WorldEnvironment
var _sun: DirectionalLight3D
var _ground: StaticBody3D

func build(config: LevelConfig) -> void:
	# Clear previous
	for child in get_children():
		child.queue_free()

	_build_environment(config)
	_build_ground(config)
	_build_arena_wall(config)
	_build_props(config)
	_build_sun(config)

func _build_environment(config: LevelConfig) -> void:
	_env_node = WorldEnvironment.new()
	var env := Environment.new()

	# Sky
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = config.sky_top
	sky_mat.sky_horizon_color = config.sky_bottom
	sky_mat.ground_bottom_color = config.ground_color
	sky_mat.ground_horizon_color = config.fog_color
	sky.sky_material = sky_mat
	env.sky = sky
	env.background_mode = Environment.BG_SKY

	# Fog
	env.fog_enabled = true
	env.fog_light_color = config.fog_color
	env.fog_density = 0.005
	env.fog_sky_affect = 0.5

	# Ambient light
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = config.ambient_color
	env.ambient_light_energy = config.ambient_intensity

	# Tonemap
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.15

	# Glow
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_bloom = 0.1

	# SSAO
	env.ssao_enabled = true
	env.ssao_radius = 2.0
	env.ssao_intensity = 1.5

	_env_node.environment = env
	add_child(_env_node)

func _build_ground(config: LevelConfig) -> void:
	_ground = StaticBody3D.new()
	_ground.collision_layer = 1  # environment

	# Ground mesh with textured material
	var mesh_inst := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(ARENA_RADIUS * 2.2, ARENA_RADIUS * 2.2)
	plane.subdivide_width = 32
	plane.subdivide_depth = 32
	mesh_inst.mesh = plane

	# PBR ground material (procedural texture via noise)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = config.ground_color

	# Add noise texture for ground detail
	var noise_tex := NoiseTexture2D.new()
	var noise := FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_PERLIN
	noise.frequency = 0.05
	noise_tex.noise = noise
	noise_tex.width = 512
	noise_tex.height = 512
	mat.albedo_texture = noise_tex

	mat.roughness = 0.85
	mat.metallic = 0.0
	mat.normal_enabled = true

	# Normal map from noise for surface detail
	var normal_noise_tex := NoiseTexture2D.new()
	var normal_noise := FastNoiseLite.new()
	normal_noise.noise_type = FastNoiseLite.TYPE_PERLIN
	normal_noise.frequency = 0.1
	normal_noise_tex.noise = normal_noise
	normal_noise_tex.width = 512
	normal_noise_tex.height = 512
	normal_noise_tex.as_normal_map = true
	mat.normal_texture = normal_noise_tex
	mat.normal_scale = 0.5

	# UV scale to tile the texture
	mat.uv1_scale = Vector3(8, 8, 8)

	mesh_inst.material_override = mat
	_ground.add_child(mesh_inst)

	# Collision shape
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(ARENA_RADIUS * 2.2, 0.1, ARENA_RADIUS * 2.2)
	col.shape = shape
	col.position.y = -0.05
	_ground.add_child(col)

	add_child(_ground)

func _build_arena_wall(config: LevelConfig) -> void:
	# Invisible cylindrical wall at arena edge
	var wall := StaticBody3D.new()
	wall.collision_layer = 1
	# Use 16 box segments in a circle
	for i in 16:
		var angle := float(i) / 16.0 * TAU
		var col := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = Vector3(12.0, 10.0, 0.5)
		col.shape = shape
		col.position = Vector3(sin(angle) * ARENA_RADIUS, 5.0, cos(angle) * ARENA_RADIUS)
		col.rotation.y = angle
		wall.add_child(col)
	add_child(wall)

func _build_props(config: LevelConfig) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = config.id * 12345
	for i in config.prop_count:
		var angle := rng.randf() * TAU
		var dist := rng.randf_range(5.0, PLAY_BOUNDS - 2.0)
		var pos := Vector3(sin(angle) * dist, 0, cos(angle) * dist)
		_spawn_prop(pos, config, rng)

func _spawn_prop(pos: Vector3, config: LevelConfig, rng: RandomNumberGenerator) -> void:
	var prop := StaticBody3D.new()
	prop.collision_layer = 1

	var mesh_inst := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()

	match config.theme:
		"forest":
			_build_tree(mesh_inst, mat, rng, pos)
		"desert":
			_build_rock(mesh_inst, mat, rng, pos)
		"alien":
			_build_crystal(mesh_inst, mat, rng, pos)

	mesh_inst.material_override = mat
	prop.add_child(mesh_inst)

	# Simple collision
	var col := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 0.8
	shape.height = 3.0
	col.shape = shape
	col.position.y = 1.5
	prop.add_child(col)

	prop.position = pos
	add_child(prop)

func _build_tree(mesh: MeshInstance3D, mat: StandardMaterial3D, rng: RandomNumberGenerator, _pos: Vector3) -> void:
	# Trunk (cylinder) + canopy (sphere)
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.2
	trunk_mesh.bottom_radius = 0.4
	trunk_mesh.height = rng.randf_range(2.5, 4.5)
	mesh.mesh = trunk_mesh
	mesh.position.y = trunk_mesh.height * 0.5

	mat.albedo_color = Color(0.45, 0.3, 0.15)
	mat.roughness = 0.9

	# Add canopy as child
	var canopy := MeshInstance3D.new()
	var canopy_mesh := SphereMesh.new()
	canopy_mesh.radius = rng.randf_range(1.5, 3.0)
	canopy_mesh.height = canopy_mesh.radius * 1.6
	canopy.mesh = canopy_mesh
	canopy.position.y = trunk_mesh.height * 0.5 + canopy_mesh.radius * 0.3

	var canopy_mat := StandardMaterial3D.new()
	canopy_mat.albedo_color = Color(
		rng.randf_range(0.2, 0.4),
		rng.randf_range(0.5, 0.8),
		rng.randf_range(0.1, 0.3),
	)
	canopy_mat.roughness = 0.7
	# Add subtle noise texture to canopy
	var noise_tex := NoiseTexture2D.new()
	var noise := FastNoiseLite.new()
	noise.frequency = 0.15
	noise_tex.noise = noise
	noise_tex.width = 128
	noise_tex.height = 128
	canopy_mat.albedo_texture = noise_tex
	canopy_mat.uv1_scale = Vector3(3, 3, 3)
	canopy.material_override = canopy_mat
	mesh.add_child(canopy)

func _build_rock(mesh: MeshInstance3D, mat: StandardMaterial3D, rng: RandomNumberGenerator, _pos: Vector3) -> void:
	var rock := SphereMesh.new()
	rock.radius = rng.randf_range(0.8, 2.5)
	rock.height = rock.radius * rng.randf_range(0.6, 1.4)
	mesh.mesh = rock
	mesh.position.y = rock.height * 0.4
	# Random slight rotation for variety
	mesh.rotation.x = rng.randf_range(-0.2, 0.2)
	mesh.rotation.z = rng.randf_range(-0.2, 0.2)

	mat.albedo_color = Color(
		rng.randf_range(0.6, 0.8),
		rng.randf_range(0.5, 0.7),
		rng.randf_range(0.3, 0.5),
	)
	mat.roughness = 0.95
	mat.metallic = 0.05

	# Noise texture for rock grain
	var noise_tex := NoiseTexture2D.new()
	var noise := FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_CELLULAR
	noise.frequency = 0.08
	noise_tex.noise = noise
	noise_tex.width = 256
	noise_tex.height = 256
	mat.albedo_texture = noise_tex
	mat.uv1_scale = Vector3(4, 4, 4)

func _build_crystal(mesh: MeshInstance3D, mat: StandardMaterial3D, rng: RandomNumberGenerator, _pos: Vector3) -> void:
	# Alien crystals — prism shapes with emissive glow
	var crystal := PrismMesh.new()
	crystal.size = Vector3(
		rng.randf_range(0.5, 1.5),
		rng.randf_range(2.0, 5.0),
		rng.randf_range(0.5, 1.5),
	)
	mesh.mesh = crystal
	mesh.position.y = crystal.size.y * 0.5
	mesh.rotation.y = rng.randf() * TAU

	var hue := rng.randf_range(0.6, 0.85)
	mat.albedo_color = Color.from_hsv(hue, 0.6, 0.4)
	mat.roughness = 0.2
	mat.metallic = 0.6
	mat.emission_enabled = true
	mat.emission = Color.from_hsv(hue, 0.8, 1.0)
	mat.emission_energy_multiplier = 2.0
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color.a = 0.85
