class_name TankPlayer
extends CharacterBody3D

## Player tank with physics-based movement, shooting, skills

signal died
signal took_damage(current_hp: float, max_hp: float)
signal healed(current_hp: float, max_hp: float)

@export var camera_pivot: Node3D
@export var muzzle_marker: Marker3D
@export var body_mesh: MeshInstance3D
@export var turret_mesh: MeshInstance3D
@export var barrel_mesh: MeshInstance3D
@export var shield_visual: MeshInstance3D

const PLAYER_RADIUS := 1.1
const GRAVITY := 20.0

var hp: float = 100.0
var max_hp: float = 100.0
var alive: bool = true

# Camera orbit
var cam_yaw: float = PI
var cam_pitch: float = 0.12
var cam_distance: float = 9.0
var aim_point := Vector3(0, 1, -10)

# Movement
var move_input := Vector2.ZERO
var dash_timer: float = 0.0
var dash_speed: float = 0.0
var dash_dir := Vector3.ZERO

# Shield
var shield_timer: float = 0.0
var is_shielded: bool = false

# Shooting
var fire_timer: float = 0.0

# Stats reference
var stats: PlayerStats

func _ready() -> void:
	if shield_visual:
		shield_visual.visible = false

func init_stats(s: PlayerStats) -> void:
	stats = s
	max_hp = stats.max_hp
	hp = max_hp

func reset_for_run() -> void:
	hp = stats.max_hp
	max_hp = stats.max_hp
	alive = true
	shield_timer = 0.0
	dash_timer = 0.0
	fire_timer = 0.0
	is_shielded = false
	if shield_visual:
		shield_visual.visible = false

func _physics_process(delta: float) -> void:
	if not alive:
		return

	# Gravity
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	
	# Movement (relative to camera yaw)
	if dash_timer > 0:
		dash_timer -= delta
		velocity.x = dash_dir.x * dash_speed
		velocity.z = dash_dir.z * dash_speed
	elif move_input.length_squared() > 0.01:
		var forward := Vector3(sin(cam_yaw), 0, cos(cam_yaw))
		var right := Vector3(cos(cam_yaw), 0, -sin(cam_yaw))
		var dir := (forward * move_input.y + right * move_input.x).normalized()
		var speed := stats.move_speed if stats else 8.0
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
		# Rotate body to face movement direction
		var target_angle := atan2(dir.x, dir.z)
		rotation.y = lerp_angle(rotation.y, target_angle, delta * 10.0)
	else:
		velocity.x = move_toward(velocity.x, 0, delta * 30.0)
		velocity.z = move_toward(velocity.z, 0, delta * 30.0)

	move_and_slide()

	# Clamp to arena
	var flat := Vector2(position.x, position.z)
	if flat.length() > 27.0:
		flat = flat.normalized() * 27.0
		position.x = flat.x
		position.z = flat.y

	# Shield countdown
	if shield_timer > 0:
		shield_timer -= delta
		if shield_timer <= 0:
			is_shielded = false
			if shield_visual:
				shield_visual.visible = false

	# Regen
	if stats and stats.regen > 0:
		heal(stats.regen * delta)

	# Fire rate timer
	fire_timer -= delta

	# Update camera
	_update_camera(delta)

	# Update aim point
	_update_aim()

func _update_camera(delta: float) -> void:
	if not camera_pivot:
		return
	cam_pitch = clampf(cam_pitch, -0.6, 1.2)
	var offset := Vector3(
		sin(cam_yaw) * cos(cam_pitch) * cam_distance,
		sin(cam_pitch) * cam_distance + 2.0,
		cos(cam_yaw) * cos(cam_pitch) * cam_distance,
	)
	var target_pos := position + offset
	camera_pivot.global_position = camera_pivot.global_position.lerp(target_pos, delta * 12.0)
	camera_pivot.look_at(position + Vector3.UP * 1.4, Vector3.UP)

func _update_aim() -> void:
	# Aim point on ground plane from camera center ray
	if not camera_pivot or not camera_pivot is Camera3D:
		var forward := Vector3(sin(cam_yaw), 0, cos(cam_yaw))
		aim_point = position + forward * 15.0
		return
	var cam := camera_pivot as Camera3D
	var screen_center := cam.get_viewport().get_visible_rect().size * 0.5
	var from := cam.project_ray_origin(screen_center)
	var dir := cam.project_ray_normal(screen_center)
	if dir.y < -0.01:
		var t := -from.y / dir.y
		aim_point = from + dir * t
	else:
		aim_point = position + Vector3(sin(cam_yaw), 0, cos(cam_yaw)) * 20.0

func take_damage(amount: float) -> void:
	if not alive or is_shielded:
		return
	hp -= amount
	took_damage.emit(hp, max_hp)
	if hp <= 0:
		hp = 0
		alive = false
		died.emit()

func heal(amount: float) -> void:
	if not alive:
		return
	hp = minf(hp + amount, max_hp)
	healed.emit(hp, max_hp)

func shield(dur: float) -> void:
	shield_timer = dur
	is_shielded = true
	if shield_visual:
		shield_visual.visible = true

func jump() -> void:
	if is_on_floor():
		velocity.y = 10.0

func dash(yaw: float, dur: float, speed: float) -> void:
	dash_timer = dur
	dash_speed = speed
	dash_dir = Vector3(sin(yaw), 0, cos(yaw))

func can_fire() -> bool:
	return fire_timer <= 0 and alive

func fire() -> void:
	if not can_fire():
		return
	var rate := stats.fire_rate if stats else 1.6
	fire_timer = 1.0 / rate

func muzzle_world() -> Vector3:
	if muzzle_marker:
		return muzzle_marker.global_position
	return position + Vector3.UP * 1.2 + Vector3(sin(cam_yaw), 0, cos(cam_yaw)) * 2.0
