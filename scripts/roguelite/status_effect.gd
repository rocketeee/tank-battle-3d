class_name StatusEffect
extends RefCounted

## Status effect applied to a damageable entity

enum Type { BURN, CHILL, SHOCK, MARK }

var type: Type
var remaining: float
var potency: float  # burn=dps, chill=slow%, shock=chain_dmg, mark=bonus_dmg%
var stacks: int = 1

func _init(t: Type, dur: float, pot: float = 1.0, st: int = 1) -> void:
	type = t
	remaining = dur
	potency = pot
	stacks = st

func tick(dt: float) -> bool:
	remaining -= dt
	return remaining <= 0.0

static func type_name(t: Type) -> String:
	match t:
		Type.BURN: return "灼烧"
		Type.CHILL: return "冰冻"
		Type.SHOCK: return "感电"
		Type.MARK: return "标记"
	return ""

static func type_color(t: Type) -> Color:
	match t:
		Type.BURN: return Color(1.0, 0.4, 0.1)
		Type.CHILL: return Color(0.3, 0.7, 1.0)
		Type.SHOCK: return Color(0.9, 0.9, 0.2)
		Type.MARK: return Color(1.0, 0.3, 0.6)
	return Color.WHITE
