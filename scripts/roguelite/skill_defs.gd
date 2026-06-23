class_name SkillDefs
extends RefCounted

## Runtime skill state (cooldowns, casting)

var id: String
var name: String
var icon: String
var trigger: String  # "auto" | "button"
var base_cooldown: float
var max_level: int
var cooldown_remaining: float = 0.0
var level: int = 1
var cast_fn: Callable

func _init(def: Dictionary) -> void:
	id = def.get("id", "")
	name = def.get("name", "")
	icon = def.get("icon", "")
	trigger = def.get("trigger", "button")
	base_cooldown = def.get("base_cooldown", 5.0)
	max_level = def.get("max_level", 3)
	if def.has("cast"):
		cast_fn = def.cast

func effective_cooldown(stats: PlayerStats) -> float:
	return base_cooldown * (1.0 - stats.cdr)

func tick(dt: float) -> void:
	if cooldown_remaining > 0.0:
		cooldown_remaining -= dt

func is_ready() -> bool:
	return cooldown_remaining <= 0.0

func cast(game_api: Dictionary) -> void:
	if cast_fn.is_valid():
		cast_fn.call(game_api, level)
	cooldown_remaining = effective_cooldown(game_api.stats)

func cooldown_fraction() -> float:
	if base_cooldown <= 0.0:
		return 0.0
	return clampf(cooldown_remaining / base_cooldown, 0.0, 1.0)
