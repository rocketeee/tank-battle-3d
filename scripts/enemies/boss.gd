class_name BossEnemy
extends EnemyBase

## Boss enemy: larger, tougher, different attack patterns

@export var boss_name: String = "机械统帅"
@export var phase_2_threshold: float = 0.5  # HP% to enter phase 2

var phase: int = 1
var special_timer: float = 8.0

func _ready() -> void:
	is_boss = true
	base_hp = 1500.0
	move_speed = 2.5
	attack_range = 15.0
	attack_damage = 20.0
	attack_cooldown = 1.5
	head_y = 4.0
	body_radius = 2.0

func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if not alive:
		return

	# Phase transition
	if phase == 1 and hp / max_hp < phase_2_threshold:
		phase = 2
		move_speed = 3.5
		attack_cooldown = 1.0
		attack_damage = 30.0

	# Special attack timer
	special_timer -= delta
	if special_timer <= 0:
		special_timer = 6.0 if phase == 1 else 4.0
		_special_attack()

func _attack() -> void:
	# Boss fires a projectile instead of melee
	if target and is_instance_valid(target):
		var dir := (target.global_position - global_position).normalized()
		# Signal main game to spawn boss bullet
		# This is handled via the game's bullet system

func _special_attack() -> void:
	# Phase 1: burst fire
	# Phase 2: AoE slam
	pass  # Implemented by main game observing boss state

func get_boss_name() -> String:
	match GameManager.level_index:
		0: return "森林守卫"
		1: return "沙漠暴君"
		2: return "虚空统帅"
	return boss_name
