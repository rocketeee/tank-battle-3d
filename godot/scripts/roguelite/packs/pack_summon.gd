class_name PackSummon
extends RefCounted

## Summon skills: Drone Barrage, Sentry, Missile Rain

static func register() -> void:
	# --- DRONE BARRAGE (auto turret) ---
	UpgradeRegistry.register_skill({
		"id": "drone_barrage",
		"name": "无人机齐射",
		"icon": "🤖",
		"trigger": "auto",
		"base_cooldown": 5.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var targets: Array = api.nearest.call(pos, 2 + lvl, 20.0)
			var dmg := api.stats.damage * 0.35
			for t: Dictionary in targets:
				var tpos: Vector3 = t.position
				var dir := (tpos - pos).normalized()
				api.spawn_bullet.call({
					"pos": pos + Vector3.UP * 2.5 + dir * 1.5,
					"dir": dir,
					"speed": api.stats.bullet_speed * 1.2,
					"damage": dmg,
					"color": Color(0.3, 1.0, 0.5),
					"size": 0.12,
				})
			api.audio.call("play_shoot")
	})
	UpgradeRegistry.register_upgrade({
		"id": "drone_barrage",
		"name": "无人机齐射",
		"icon": "🤖",
		"desc": func(lvl: int) -> String: return "自动锁定 %d 个目标发射追踪弹" % (2 + lvl),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["summon", "offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "drone_barrage" not in run.owned_skills:
				run.owned_skills.append("drone_barrage")
	})

	# --- SENTRY (auto turret on ground) ---
	UpgradeRegistry.register_skill({
		"id": "sentry",
		"name": "散弹哨戒",
		"icon": "🔫",
		"trigger": "auto",
		"base_cooldown": 6.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var count := 6 + lvl * 2
			var dmg := api.stats.damage * 0.25
			for i in count:
				var angle := randf() * TAU
				var dir := Vector3(sin(angle), randf() * 0.2 - 0.1, cos(angle)).normalized()
				api.spawn_bullet.call({
					"pos": pos + Vector3.UP * 0.8,
					"dir": dir,
					"speed": api.stats.bullet_speed * 0.9,
					"damage": dmg,
					"color": Color(0.8, 0.8, 0.3),
					"size": 0.1,
				})
			api.audio.call("play_shoot")
	})
	UpgradeRegistry.register_upgrade({
		"id": "sentry",
		"name": "散弹哨戒",
		"icon": "🔫",
		"desc": func(lvl: int) -> String: return "自动向四周发射 %d 发散弹" % (6 + lvl * 2),
		"rarity": "common",
		"kind": "skill",
		"tags": ["summon"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "sentry" not in run.owned_skills:
				run.owned_skills.append("sentry")
	})

	# --- MISSILE RAIN ---
	UpgradeRegistry.register_skill({
		"id": "missile_rain",
		"name": "导弹雨",
		"icon": "🚀",
		"trigger": "button",
		"base_cooldown": 15.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var center: Vector3 = api.ground_aim.call()
			var radius := 8.0 * api.stats.area_mult
			var count := 6 + lvl * 3
			var dmg := api.stats.damage * (0.6 + lvl * 0.2)
			for _i in count:
				var offset := Vector3(randf_range(-radius, radius), 0, randf_range(-radius, radius))
				var target_pos := center + offset
				api.deal_aoe.call(target_pos, 2.5, dmg)
				api.particles.call("emit_explosion", target_pos, 2.5, Color(1.0, 0.6, 0.2))
			api.audio.call("play_explosion")
	})
	UpgradeRegistry.register_upgrade({
		"id": "missile_rain",
		"name": "导弹雨",
		"icon": "🚀",
		"desc": func(lvl: int) -> String: return "瞄准区域降下 %d 枚导弹" % (6 + lvl * 3),
		"rarity": "epic",
		"kind": "skill",
		"tags": ["summon", "aoe"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "missile_rain" not in run.owned_skills:
				run.owned_skills.append("missile_rain")
	})

	# --- SWARM EVOLUTION ---
	UpgradeRegistry.register_upgrade({
		"id": "swarm_evo",
		"name": "蜂群进化",
		"icon": "🐝",
		"desc": func(_lvl: int) -> String: return "无人机齐射 + 导弹雨 → 蜂群：持续自动锁定轰炸",
		"rarity": "legendary",
		"kind": "evolution",
		"tags": ["summon"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.has_skill("drone_barrage") and run.has_skill("missile_rain"),
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["swarm_evo"] = 1
	})
