class_name EnemyBase
extends CharacterBody3D

## Base enemy class with physics movement + health + status effects

signal died(enemy: EnemyBase)
signal took_damage_signal(enemy: EnemyBase)

@export var kind: String = "alien"  # "alien" | "ufo"
@export var base_hp: float = 40.0
@export var move_speed: float = 4.0
@export var attack_range: float = 12.0
@export var attack_damage: float = 8.0
@export var attack_cooldown: float = 2.0
@export var head_y: float = 2.0
@export var body_radius: float = 0.8

var hp: float = 40.0
var max_hp: float = 40.0
var alive: bool = true
var is_boss: bool = false

var target: Node3D = null
var fire_timer: float = 0.0
var status_effects: Array[StatusEffect] = []

# Visual refs (set by scene)
var health_bar: Node = null
var body_mesh: MeshInstance3D = null

const GRAVITY := 20.0

func init(hp_scale: float = 1.0) -> void:
	max_hp = base_hp * hp_scale
	hp = max_hp
	alive = true
	status_effects.clear()

func _physics_process(delta: float) -> void:
	if not alive:
		return

	# Gravity
	if not is_on_floor():
		velocity.y -= GRAVITY * delta

	# Move toward target
	if target and is_instance_valid(target):
		var to_target := target.global_position - global_position
		to_target.y = 0
		var dist := to_target.length()

		if dist > 2.5:
			var dir := to_target.normalized()
			var speed := move_speed * _get_slow_mult()
			velocity.x = dir.x * speed
			velocity.z = dir.z * speed
			# Face target
			rotation.y = lerp_angle(rotation.y, atan2(dir.x, dir.z), delta * 8.0)
		else:
			velocity.x = move_toward(velocity.x, 0, delta * 20.0)
			velocity.z = move_toward(velocity.z, 0, delta * 20.0)

		# Attack
		fire_timer -= delta
		if dist < attack_range and fire_timer <= 0:
			fire_timer = attack_cooldown
			_attack()

	move_and_slide()

	# Tick status effects
	_tick_statuses(delta)

func _get_slow_mult() -> float:
	for s in status_effects:
		if s.type == StatusEffect.Type.CHILL:
			return 1.0 - s.potency
	return 1.0

func _attack() -> void:
	if target and target.has_method("take_damage"):
		target.take_damage(attack_damage)

func take_damage(amount: float, opts: Dictionary = {}) -> Dictionary:
	if not alive:
		return {"crit": false, "dmg": 0.0, "killed": false}

	var is_crit := false
	var final_dmg := amount

	# Crit check
	if not opts.get("no_crit", false):
		var crit_chance: float = opts.get("crit_chance", 0.05)
		crit_chance += opts.get("bonus_crit_chance", 0.0)
		if opts.get("force_crit", false) or randf() < crit_chance:
			is_crit = true
			final_dmg *= opts.get("crit_mult", 2.0)

	# Damage mult
	final_dmg *= opts.get("damage_mult", 1.0)

	# Mark bonus
	for s in status_effects:
		if s.type == StatusEffect.Type.MARK:
			final_dmg *= 1.0 + s.stacks * 0.15

	hp -= final_dmg
	took_damage_signal.emit(self)

	var killed := false
	if hp <= 0:
		hp = 0
		killed = true
		_die()

	return {"crit": is_crit, "dmg": final_dmg, "killed": killed}

func apply_status(type: StatusEffect.Type, dur: float, potency: float = 1.0, stacks: int = 1) -> void:
	# Refresh or add
	for s in status_effects:
		if s.type == type:
			s.remaining = maxf(s.remaining, dur)
			s.potency = maxf(s.potency, potency)
			s.stacks += stacks
			return
	status_effects.append(StatusEffect.new(type, dur, potency, stacks))

func _tick_statuses(delta: float) -> void:
	var to_remove: Array[int] = []
	for i in status_effects.size():
		var s := status_effects[i]
		# Burn DoT
		if s.type == StatusEffect.Type.BURN:
			hp -= s.potency * delta
			if hp <= 0 and alive:
				hp = 0
				_die()
		if s.tick(delta):
			to_remove.append(i)
	to_remove.reverse()
	for idx in to_remove:
		status_effects.remove_at(idx)

func _die() -> void:
	alive = false
	died.emit(self)
	# Fade out and remove
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3.ZERO, 0.3)
	tween.tween_callback(queue_free)

func has_status(type: StatusEffect.Type) -> bool:
	for s in status_effects:
		if s.type == type:
			return true
	return false

func get_status(type: StatusEffect.Type) -> StatusEffect:
	for s in status_effects:
		if s.type == type:
			return s
	return null
