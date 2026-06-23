class_name PlayerStats
extends RefCounted

## Mutable run-scoped player stats with hyperbolic stacking

# Base values
const BASE_HP := 100.0
const BASE_SPEED := 8.0
const BASE_DAMAGE := 25.0
const BASE_FIRE_RATE := 1.6     # shots/sec
const BASE_BULLET_SPEED := 40.0
const BASE_BULLET_SIZE := 0.18
const BASE_CRIT_CHANCE := 0.05
const BASE_CRIT_MULT := 2.0
const BASE_CDR := 0.0
const BASE_AREA := 1.0
const BASE_REGEN := 0.0

# Additive stacks (hyperbolic diminishing applied at read time)
var hp_stacks: int = 0
var speed_stacks: int = 0
var damage_stacks: int = 0
var fire_rate_stacks: int = 0
var bullet_speed_stacks: int = 0
var bullet_size_stacks: int = 0
var crit_chance_stacks: int = 0
var crit_mult_stacks: int = 0
var cdr_stacks: int = 0
var area_stacks: int = 0
var regen_stacks: int = 0
var pierce_stacks: int = 0
var burn_amp_stacks: int = 0
var mark_amp_stacks: int = 0

## Hyperbolic diminishing: each stack gives `per_stack` but total caps asymptotically
static func hyperbolic(per_stack: float, stacks: int) -> float:
	if stacks <= 0:
		return 0.0
	var x := per_stack * stacks
	return x / (1.0 + x)

# Computed getters
var max_hp: float:
	get: return BASE_HP * (1.0 + hyperbolic(0.15, hp_stacks))

var move_speed: float:
	get: return BASE_SPEED * (1.0 + hyperbolic(0.10, speed_stacks))

var damage: float:
	get: return BASE_DAMAGE * (1.0 + hyperbolic(0.12, damage_stacks))

var fire_rate: float:
	get: return BASE_FIRE_RATE * (1.0 + hyperbolic(0.10, fire_rate_stacks))

var bullet_speed: float:
	get: return BASE_BULLET_SPEED * (1.0 + hyperbolic(0.08, bullet_speed_stacks))

var bullet_size: float:
	get: return BASE_BULLET_SIZE * (1.0 + hyperbolic(0.15, bullet_size_stacks))

var crit_chance: float:
	get: return BASE_CRIT_CHANCE + hyperbolic(0.08, crit_chance_stacks)

var crit_mult: float:
	get: return BASE_CRIT_MULT + crit_mult_stacks * 0.25

var cdr: float:
	get: return hyperbolic(0.10, cdr_stacks)

var area_mult: float:
	get: return BASE_AREA * (1.0 + hyperbolic(0.12, area_stacks))

var regen: float:
	get: return BASE_REGEN + regen_stacks * 0.6

var pierce: int:
	get: return pierce_stacks

var burn_amp: float:
	get: return 1.0 + hyperbolic(0.15, burn_amp_stacks)

var mark_amp: float:
	get: return 1.0 + hyperbolic(0.15, mark_amp_stacks)

func reset() -> void:
	hp_stacks = 0
	speed_stacks = 0
	damage_stacks = 0
	fire_rate_stacks = 0
	bullet_speed_stacks = 0
	bullet_size_stacks = 0
	crit_chance_stacks = 0
	crit_mult_stacks = 0
	cdr_stacks = 0
	area_stacks = 0
	regen_stacks = 0
	pierce_stacks = 0
	burn_amp_stacks = 0
	mark_amp_stacks = 0
