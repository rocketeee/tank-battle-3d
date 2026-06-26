class_name Leveling
extends RefCounted

## XP / level system — kill enemies to level up, trigger card selection

signal leveled_up(new_level: int)

var xp: int = 0
var level: int = 1
var pending_levels: int = 0

const XP_PER_KILL := { "alien": 20, "ufo": 35, "boss": 150 }

func xp_for_level(lvl: int) -> int:
	# Quadratic: 80, 120, 170, 230, 300, 380 ...
	return 60 + lvl * 20 + int(pow(lvl, 1.4)) * 5

func xp_to_next() -> int:
	return xp_for_level(level)

func add_xp(amount: int) -> void:
	xp += amount
	while xp >= xp_to_next():
		xp -= xp_to_next()
		level += 1
		pending_levels += 1
		leveled_up.emit(level)

func add_kill_xp(kind: String) -> void:
	var base: int = XP_PER_KILL.get(kind, 20)
	add_xp(base)

func reset() -> void:
	xp = 0
	level = 1
	pending_levels = 0
