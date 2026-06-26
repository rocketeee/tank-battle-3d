class_name PackPhysical
extends RefCounted

## Physical: Shockwave (melee AoE), Whirlwind (auto spin), Charge

static func register() -> void:
	# --- SHOCKWAVE ---
	UpgradeRegistry.register_skill({
		"id": "shockwave",
		"name": "冲击波",
		"icon": "💢",
		"trigger": "button",
		"base_cooldown": 8.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var radius: float = 6.0 * api.stats.area_mult
			var dmg: float = api.stats.damage * (1.2 + lvl * 0.4)
			api.deal_aoe.call(pos, radius, dmg)
			api.particles.call("emit_shockwave", pos, radius)
			api.audio.call("play_explosion")
	})
	UpgradeRegistry.register_upgrade({
		"id": "shockwave",
		"name": "冲击波",
		"icon": "💢",
		"desc": func(lvl: int) -> String: return "释放环形冲击波，伤害 %d%%" % int((1.2 + lvl * 0.4) * 100),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["physical", "aoe", "melee"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "shockwave" not in run.owned_skills:
				run.owned_skills.append("shockwave")
	})

	# --- WHIRLWIND (auto) ---
	UpgradeRegistry.register_skill({
		"id": "whirlwind",
		"name": "旋风刃",
		"icon": "🌪️",
		"trigger": "auto",
		"base_cooldown": 2.5,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var radius: float = 4.0 * api.stats.area_mult
			var dmg: float = api.stats.damage * (0.4 + lvl * 0.15)
			api.deal_aoe.call(pos, radius, dmg)
			api.particles.call("emit_whirlwind", pos, radius)
	})
	UpgradeRegistry.register_upgrade({
		"id": "whirlwind",
		"name": "旋风刃",
		"icon": "🌪️",
		"desc": func(lvl: int) -> String: return "自动旋转攻击近距离敌人，%d%% 伤害" % int((0.4 + lvl * 0.15) * 100),
		"rarity": "common",
		"kind": "skill",
		"tags": ["physical", "melee"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "whirlwind" not in run.owned_skills:
				run.owned_skills.append("whirlwind")
	})

	# --- FLAME CHARGE (melee dash + fire trail) ---
	UpgradeRegistry.register_skill({
		"id": "flame_charge",
		"name": "烈焰冲撞",
		"icon": "🔥",
		"trigger": "button",
		"base_cooldown": 9.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var dur := 0.4
			var speed := 28.0 + lvl * 4.0
			api.player.call("dash", api.cam_yaw, dur, speed)
			# AoE along dash path
			var pos: Vector3 = api.player_pos.call()
			var yaw: float = api.cam_yaw
			var dmg: float = api.stats.damage * (0.8 + lvl * 0.3)
			var dir := Vector3(sin(yaw), 0.0, cos(yaw))
			for i in 3:
				var p := pos + dir * (float(i) * 3.0)
				api.deal_aoe.call(p, 3.0, dmg)
				api.particles.call("emit_explosion", p, 3.0, Color(1.0, 0.4, 0.1))
			api.audio.call("play_explosion")
	})
	UpgradeRegistry.register_upgrade({
		"id": "flame_charge",
		"name": "烈焰冲撞",
		"icon": "🔥",
		"desc": func(lvl: int) -> String: return "火焰冲锋，沿途造成 %d%% 伤害" % int((0.8 + lvl * 0.3) * 100),
		"rarity": "epic",
		"kind": "skill",
		"tags": ["physical", "fire", "melee"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "flame_charge" not in run.owned_skills:
				run.owned_skills.append("flame_charge")
	})

	# --- QUAKE EVOLUTION ---
	UpgradeRegistry.register_upgrade({
		"id": "quake_evo",
		"name": "震地进化",
		"icon": "🏔️",
		"desc": func(_lvl: int) -> String: return "冲击波 + 震地猛击 → 地裂：裂缝持续伤害",
		"rarity": "legendary",
		"kind": "evolution",
		"tags": ["physical"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.has_skill("shockwave") and run.has_skill("slam"),
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["quake_evo"] = 1
	})
