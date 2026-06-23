class_name PackLightning
extends RefCounted

## Lightning element: Chain Lightning, Shock, Overload synergy

static func register() -> void:
	# --- CHAIN LIGHTNING (auto) ---
	UpgradeRegistry.register_skill({
		"id": "chain_lightning",
		"name": "连锁闪电",
		"icon": "⚡",
		"trigger": "auto",
		"base_cooldown": 4.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var targets: Array = api.nearest.call(pos, 1, 15.0)
			if targets.is_empty():
				return
			var bounces := 3 + lvl
			var dmg := api.stats.damage * 0.5
			var hit: Array[Dictionary] = []
			var current: Dictionary = targets[0]
			for _b in bounces:
				api.deal_damage.call(current, dmg)
				api.apply_status.call(current, {
					"type": "shock",
					"potency": dmg * 0.2,
					"dur": 2.0,
				})
				hit.append(current)
				var cpos: Vector3 = current.position
				api.particles.call("emit_lightning", cpos)
				var next_targets: Array = api.nearest.call(cpos, 1, 8.0, hit)
				if next_targets.is_empty():
					break
				current = next_targets[0]
				dmg *= 0.8
	})
	UpgradeRegistry.register_upgrade({
		"id": "chain_lightning",
		"name": "连锁闪电",
		"icon": "⚡",
		"desc": func(lvl: int) -> String: return "闪电跳跃 %d 次，附加感电" % (3 + lvl),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["lightning", "offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "chain_lightning" not in run.owned_skills:
				run.owned_skills.append("chain_lightning")
	})

	# --- OVERLOAD SYNERGY ---
	UpgradeRegistry.register_upgrade({
		"id": "overload",
		"name": "过载",
		"icon": "💫",
		"desc": func(_lvl: int) -> String: return "感电 + 灼烧同时存在的敌人受到额外 50% 伤害",
		"rarity": "epic",
		"kind": "synergy",
		"tags": ["lightning", "fire"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.tag_count("fire") >= 1 and run.tag_count("lightning") >= 1,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["overload"] = 1
	})
