class_name Bullet
extends Node3D

## Physics-driven bullet with collision detection

var direction := Vector3.FORWARD
var speed := 40.0
var damage := 25.0
var life := 3.0
var pierce_remaining := 0
var is_player_bullet := true
var color := Color(1, 0.8, 0.2)
var size := 0.18
var effect: Dictionary = {}  # optional status/bonus data
var _mesh: MeshInstance3D
var _area: Area3D
var _hit_targets: Array[Node] = []

func _ready() -> void:
	# Create visual
	_mesh = MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = size
	sphere.height = size * 2
	_mesh.mesh = sphere
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 3.0
	_mesh.material_override = mat
	add_child(_mesh)

	# Create collision area
	_area = Area3D.new()
	var shape := CollisionShape3D.new()
	var sphere_shape := SphereShape3D.new()
	sphere_shape.radius = size * 2.0
	shape.shape = sphere_shape
	_area.add_child(shape)
	add_child(_area)

	if is_player_bullet:
		_area.collision_layer = 8   # layer 4 (player bullets)
		_area.collision_mask = 4    # layer 3 (enemies)
	else:
		_area.collision_layer = 16  # layer 5 (enemy bullets)
		_area.collision_mask = 2    # layer 2 (player)

	_area.body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	position += direction * speed * delta
	life -= delta
	if life <= 0:
		queue_free()

	# Remove if too far from origin
	if position.length_squared() > 10000:
		queue_free()

func _on_body_entered(body: Node3D) -> void:
	if body in _hit_targets:
		return

	_hit_targets.append(body)

	if is_player_bullet and body is EnemyBase:
		var enemy := body as EnemyBase
		var opts := {}
		if effect.has("bonus_crit_chance"):
			opts["bonus_crit_chance"] = effect.bonus_crit_chance
		if effect.has("pierce"):
			pierce_remaining = effect.pierce
		var result := enemy.take_damage(damage, opts)

		# Apply statuses from effect
		if effect.has("statuses"):
			for s: Dictionary in effect.statuses:
				var type: StatusEffect.Type = s.get("type", StatusEffect.Type.BURN)
				enemy.apply_status(type, s.get("dur", 2.0), s.get("potency", 1.0))

		if pierce_remaining > 0:
			pierce_remaining -= 1
		else:
			queue_free()

	elif not is_player_bullet and body is TankPlayer:
		var player := body as TankPlayer
		player.take_damage(damage)
		queue_free()
