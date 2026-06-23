class_name UpgradeRegistry
extends RefCounted

## Singleton-like registry for all skill definitions and upgrade cards

# Rarity weights for random card draw
const RARITY_WEIGHTS := {
	"common": 100,
	"rare": 46,
	"epic": 18,
	"legendary": 6,
}

const RARITY_COLOR := {
	"common": Color(0.78, 0.82, 0.88),
	"rare": Color(0.37, 0.66, 1.0),
	"epic": Color(0.75, 0.42, 1.0),
	"legendary": Color(1.0, 0.76, 0.29),
}

const RARITY_LABEL := {
	"common": "普通",
	"rare": "稀有",
	"epic": "史诗",
	"legendary": "传说",
}

static var _skills: Dictionary = {}     # id -> SkillDef dict
static var _upgrades: Array[Dictionary] = []

static func register_skill(def: Dictionary) -> void:
	_skills[def.id] = def

static func register_upgrade(up: Dictionary) -> void:
	_upgrades.append(up)

static func get_skill(id: String) -> Dictionary:
	return _skills.get(id, {})

static func all_upgrades() -> Array[Dictionary]:
	return _upgrades

static func get_upgrade(id: String) -> Dictionary:
	for u in _upgrades:
		if u.id == id:
			return u
	return {}

## Draw N random cards from available upgrades, weighted by rarity
static func draw_cards(run: RunState, count: int = 3) -> Array[Dictionary]:
	var available: Array[Dictionary] = []
	for up in _upgrades:
		var current_lvl: int = run.upgrade_levels.get(up.id, 0)
		if current_lvl >= up.max_level:
			continue
		if up.has("available") and up.available is Callable:
			if not up.available.call(run):
				continue
		available.append(up)

	if available.is_empty():
		return []

	# Weighted random selection without replacement
	var result: Array[Dictionary] = []
	var pool := available.duplicate()
	for _i in mini(count, pool.size()):
		var total_weight := 0.0
		for u in pool:
			var w: float = RARITY_WEIGHTS.get(u.rarity, 50)
			if u.has("base_weight"):
				w = u.base_weight
			total_weight += w
		var roll := randf() * total_weight
		var acc := 0.0
		var pick_idx := 0
		for j in pool.size():
			var w: float = RARITY_WEIGHTS.get(pool[j].rarity, 50)
			if pool[j].has("base_weight"):
				w = pool[j].base_weight
			acc += w
			if acc >= roll:
				pick_idx = j
				break
		result.append(pool[pick_idx])
		pool.remove_at(pick_idx)
	return result
