class_name RunState
extends RefCounted

## Per-run mutable state: owned skills, upgrade levels, stats

var stats := PlayerStats.new()
var leveling := Leveling.new()
var owned_skills: Array[String] = ["shield"]  # start with shield only
var upgrade_levels: Dictionary = {}  # upgrade_id -> int
var tags: Dictionary = {}  # tag -> count (for synergy gating)

func reset() -> void:
	stats.reset()
	leveling.reset()
	owned_skills = ["shield"]
	upgrade_levels = {}
	tags = {}

func apply_upgrade(up: Dictionary) -> void:
	var uid: String = up.id
	var cur_lvl: int = upgrade_levels.get(uid, 0)
	var new_lvl := cur_lvl + 1
	upgrade_levels[uid] = new_lvl

	# Add tags
	if up.has("tags"):
		for tag: String in up.tags:
			tags[tag] = tags.get(tag, 0) + 1

	# If this is a skill unlock, add to owned
	if up.kind == "skill" and uid not in owned_skills:
		owned_skills.append(uid)

	# Apply the upgrade effect
	if up.has("apply") and up.apply is Callable:
		up.apply.call(self, new_lvl)

func has_skill(id: String) -> bool:
	return id in owned_skills

func has_upgrade(id: String, min_level: int = 1) -> bool:
	return upgrade_levels.get(id, 0) >= min_level

func tag_count(tag: String) -> int:
	return tags.get(tag, 0)
