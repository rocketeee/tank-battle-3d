class_name PackFire
extends RefCounted

## Fire element: Flame Thrower, Burn DoT, Inferno evolution

static func register() -> void:
	# --- FLAME THROWER (auto skill) ---
	UpgradeRegistry.register_skill({
		"id": "flame",
		"name": "喷火器",
		"icon": "🔥",
		"trigger": "auto",
		"base_cooldown": 3.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var yaw: float = api.cam_yaw
			var dir := Vector3(sin(yaw), 0.0, cos(yaw))
			var range_val := 8.0 + lvl * 2.0
			var dmg: float = api.stats.damage * 0.4 * api.stats.burn_amp
			var targets: Array = api.nearest.call(pos, 5, range_val)
			for t: Dictionary in targets:
				api.deal_damage.call(t, dmg)
				api.apply_status.call(t, {
					"type": "burn",
					"potency": dmg * 0.3,
					"dur": 3.0,
				})
			api.particles.call("emit_flame", pos + dir * 2.0, dir, range_val)
	})
	UpgradeRegistry.register_upgrade({
		"id": "flame",
		"name": "喷火器",
		"icon": "🔥",
		"desc": func(lvl: int) -> String: return "前方喷射火焰，附加灼烧（范围 %dm）" % (8 + lvl * 2),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["fire", "offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "flame" not in run.owned_skills:
				run.owned_skills.append("flame")
	})

	# --- BURN AMP ---
	UpgradeRegistry.register_upgrade({
		"id": "burn_amp",
		"name": "引燃强化",
		"icon": "🌡️",
		"desc": func(lvl: int) -> String: return "灼烧伤害 +%d%%" % (lvl * 15),
		"rarity": "rare",
		"kind": "passive",
		"tags": ["fire"],
		"max_level": 4,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.burn_amp_stacks += 1
	})

	# --- INFERNO EVOLUTION ---
	UpgradeRegistry.register_upgrade({
		"id": "inferno_evo",
		"name": "炎狱进化",
		"icon": "🌋",
		"desc": func(_lvl: int) -> String: return "喷火器 + 散射弹幕 → 炎狱：灼烧的敌人爆炸扩散",
		"rarity": "legendary",
		"kind": "evolution",
		"tags": ["fire"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.has_skill("flame") and run.has_skill("scatter"),
		"apply": func(run: RunState, _lvl: int) -> void:
			# Mark as evolved — checked at runtime during burn tick
			run.upgrade_levels["inferno_evo"] = 1
	})
