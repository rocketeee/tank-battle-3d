class_name PackBase
extends RefCounted

## Base skills: Shield, Scatter Shot, Slam, Sprint, Divine Punishment

static func register() -> void:
	# --- SHIELD (starter skill) ---
	UpgradeRegistry.register_skill({
		"id": "shield",
		"name": "能量护盾",
		"icon": "🛡️",
		"trigger": "button",
		"base_cooldown": 12.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var dur := 2.0 + lvl * 0.5
			api.player.call("shield", dur)
			api.particles.call("emit_shield", api.player_pos.call())
			api.audio.call("play_skill", 440.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "shield",
		"name": "能量护盾",
		"icon": "🛡️",
		"desc": func(lvl: int) -> String: return "激活护盾 %0.1f 秒，免疫所有伤害" % (2.0 + lvl * 0.5),
		"rarity": "common",
		"kind": "skill",
		"tags": ["defense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "shield" not in run.owned_skills:
				run.owned_skills.append("shield")
	})

	# --- SCATTER SHOT ---
	UpgradeRegistry.register_skill({
		"id": "scatter",
		"name": "散射弹幕",
		"icon": "🔥",
		"trigger": "button",
		"base_cooldown": 8.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var count := 5 + lvl * 2
			var spread := 0.5
			var pos: Vector3 = api.player_pos.call()
			var yaw: float = api.cam_yaw
			for i in count:
				var angle := yaw + (float(i) - count * 0.5) * spread / count
				var dir := Vector3(sin(angle), 0.0, cos(angle)).normalized()
				api.spawn_bullet.call({
					"pos": pos + Vector3.UP * 1.2,
					"dir": dir,
					"speed": api.stats.bullet_speed,
					"damage": api.stats.damage * 0.6,
					"color": Color(1.0, 0.5, 0.1),
					"size": api.stats.bullet_size,
				})
			api.audio.call("play_skill", 330.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "scatter",
		"name": "散射弹幕",
		"icon": "🔥",
		"desc": func(lvl: int) -> String: return "扇形发射 %d 发子弹" % (5 + lvl * 2),
		"rarity": "common",
		"kind": "skill",
		"tags": ["fire", "offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "scatter" not in run.owned_skills:
				run.owned_skills.append("scatter")
	})

	# --- SLAM (jump + AoE on landing) ---
	UpgradeRegistry.register_skill({
		"id": "slam",
		"name": "震地猛击",
		"icon": "💥",
		"trigger": "button",
		"base_cooldown": 10.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			api.player.call("jump")
			var pos: Vector3 = api.player_pos.call()
			var radius: float = 5.0 * api.stats.area_mult
			var dmg: float = api.stats.damage * (1.0 + lvl * 0.3)
			# Delayed AoE after landing
			api.deal_aoe.call(pos, radius, dmg)
			api.particles.call("emit_explosion", pos, radius, Color(0.8, 0.5, 0.2))
			api.audio.call("play_explosion")
	})
	UpgradeRegistry.register_upgrade({
		"id": "slam",
		"name": "震地猛击",
		"icon": "💥",
		"desc": func(lvl: int) -> String: return "跳起砸地，对周围造成 %d%% 伤害" % int((1.0 + lvl * 0.3) * 100),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["physical", "aoe"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "slam" not in run.owned_skills:
				run.owned_skills.append("slam")
	})

	# --- SPRINT (dash) ---
	UpgradeRegistry.register_skill({
		"id": "sprint",
		"name": "极速冲刺",
		"icon": "💨",
		"trigger": "button",
		"base_cooldown": 6.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var dur := 0.3 + lvl * 0.1
			var speed := 25.0 + lvl * 5.0
			api.player.call("dash", api.cam_yaw, dur, speed)
			api.audio.call("play_skill", 550.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "sprint",
		"name": "极速冲刺",
		"icon": "💨",
		"desc": func(lvl: int) -> String: return "向前冲刺 %0.1f 秒" % (0.3 + lvl * 0.1),
		"rarity": "common",
		"kind": "skill",
		"tags": ["mobility"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "sprint" not in run.owned_skills:
				run.owned_skills.append("sprint")
	})

	# --- DIVINE PUNISHMENT (lightning bolt from sky) ---
	UpgradeRegistry.register_skill({
		"id": "divine",
		"name": "天罚",
		"icon": "⚡",
		"trigger": "button",
		"base_cooldown": 14.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var targets: Array = api.nearest.call(api.player_pos.call(), 3 + lvl, 18.0)
			var dmg: float = api.stats.damage * (1.5 + lvl * 0.5)
			for t: Dictionary in targets:
				api.deal_damage.call(t, dmg, {"force_crit": lvl >= 3})
				var tpos: Vector3 = t.position
				api.particles.call("emit_lightning", tpos)
			api.audio.call("play_skill", 220.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "divine",
		"name": "天罚",
		"icon": "⚡",
		"desc": func(lvl: int) -> String: return "雷击 %d 个目标，造成 %d%% 伤害" % [3 + lvl, int((1.5 + lvl * 0.5) * 100)],
		"rarity": "epic",
		"kind": "skill",
		"tags": ["lightning", "offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "divine" not in run.owned_skills:
				run.owned_skills.append("divine")
	})
