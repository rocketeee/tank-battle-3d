class_name PackIce
extends RefCounted

## Ice element: Frost Nova, Chill, Blizzard evolution

static func register() -> void:
	# --- FROST NOVA ---
	UpgradeRegistry.register_skill({
		"id": "frost_nova",
		"name": "冰霜新星",
		"icon": "❄️",
		"trigger": "button",
		"base_cooldown": 10.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var radius := 7.0 * api.stats.area_mult
			var dmg := api.stats.damage * (0.8 + lvl * 0.3)
			api.deal_aoe.call(pos, radius, dmg)
			var targets: Array = api.nearest.call(pos, 10, radius)
			for t: Dictionary in targets:
				api.apply_status.call(t, {
					"type": "chill",
					"potency": 0.4 + lvl * 0.1,
					"dur": 3.0 + lvl * 0.5,
				})
			api.particles.call("emit_frost_nova", pos, radius)
			api.audio.call("play_skill", 660.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "frost_nova",
		"name": "冰霜新星",
		"icon": "❄️",
		"desc": func(lvl: int) -> String: return "周围释放冰爆，减速 %d%% 持续 %0.1fs" % [int((0.4 + lvl * 0.1) * 100), 3.0 + lvl * 0.5],
		"rarity": "rare",
		"kind": "skill",
		"tags": ["ice", "aoe"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "frost_nova" not in run.owned_skills:
				run.owned_skills.append("frost_nova")
	})

	# --- BLIZZARD EVOLUTION ---
	UpgradeRegistry.register_upgrade({
		"id": "blizzard_evo",
		"name": "暴风雪进化",
		"icon": "🌨️",
		"desc": func(_lvl: int) -> String: return "冰霜新星 + 天罚 → 暴风雪：持续降下冰雹",
		"rarity": "legendary",
		"kind": "evolution",
		"tags": ["ice", "lightning"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.has_skill("frost_nova") and run.has_skill("divine"),
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["blizzard_evo"] = 1
	})
