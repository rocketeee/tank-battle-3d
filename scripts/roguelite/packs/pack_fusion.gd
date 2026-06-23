class_name PackFusion
extends RefCounted

## Cross-element evolution and synergy cards

static func register() -> void:
	# --- STEAM (Fire + Ice) ---
	UpgradeRegistry.register_upgrade({
		"id": "steam_evo",
		"name": "蒸汽爆发",
		"icon": "♨️",
		"desc": func(_lvl: int) -> String: return "灼烧 + 冰冻同时存在 → 蒸汽爆炸，范围伤害",
		"rarity": "epic",
		"kind": "synergy",
		"tags": ["fire", "ice"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.tag_count("fire") >= 1 and run.tag_count("ice") >= 1,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["steam_evo"] = 1
	})

	# --- SUPERCONDUCTOR (Ice + Lightning) ---
	UpgradeRegistry.register_upgrade({
		"id": "superconductor",
		"name": "超导",
		"icon": "🔷",
		"desc": func(_lvl: int) -> String: return "冰冻的敌人被闪电命中时伤害 x2",
		"rarity": "epic",
		"kind": "synergy",
		"tags": ["ice", "lightning"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.tag_count("ice") >= 1 and run.tag_count("lightning") >= 1,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["superconductor"] = 1
	})

	# --- SHATTER (Physical + Ice) ---
	UpgradeRegistry.register_upgrade({
		"id": "shatter",
		"name": "碎甲",
		"icon": "💎",
		"desc": func(_lvl: int) -> String: return "冰冻的敌人受到物理伤害时碎裂，溅射周围",
		"rarity": "epic",
		"kind": "synergy",
		"tags": ["physical", "ice"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.tag_count("physical") >= 1 and run.tag_count("ice") >= 1,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["shatter"] = 1
	})

	# --- MELTDOWN (Fire + Physical) ---
	UpgradeRegistry.register_upgrade({
		"id": "meltdown",
		"name": "熔毁",
		"icon": "🌡️",
		"desc": func(_lvl: int) -> String: return "灼烧的敌人受物理伤害时熔化，降低防御",
		"rarity": "epic",
		"kind": "synergy",
		"tags": ["fire", "physical"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.tag_count("fire") >= 1 and run.tag_count("physical") >= 1,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["meltdown"] = 1
	})

	# --- TIME WARP ---
	UpgradeRegistry.register_skill({
		"id": "time_warp",
		"name": "时空缓滞",
		"icon": "⏳",
		"trigger": "button",
		"base_cooldown": 18.0,
		"max_level": 2,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var radius := 12.0 * api.stats.area_mult
			var targets: Array = api.nearest.call(pos, 20, radius)
			for t: Dictionary in targets:
				api.apply_status.call(t, {
					"type": "chill",
					"potency": 0.7 + lvl * 0.15,
					"dur": 4.0 + lvl * 1.0,
				})
			api.particles.call("emit_time_warp", pos, radius)
			api.audio.call("play_skill", 150.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "time_warp",
		"name": "时空缓滞",
		"icon": "⏳",
		"desc": func(lvl: int) -> String: return "大范围减速所有敌人 %d%% 持续 %ds" % [int((0.7 + lvl * 0.15) * 100), 4 + lvl],
		"rarity": "epic",
		"kind": "skill",
		"tags": ["utility", "ice"],
		"max_level": 2,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "time_warp" not in run.owned_skills:
				run.owned_skills.append("time_warp")
	})

	# --- MARK AMP ---
	UpgradeRegistry.register_upgrade({
		"id": "mark_amp",
		"name": "标记强化",
		"icon": "🎯",
		"desc": func(lvl: int) -> String: return "标记伤害加成 +%d%%" % (lvl * 15),
		"rarity": "rare",
		"kind": "passive",
		"tags": ["utility"],
		"max_level": 4,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.mark_amp_stacks += 1
	})
