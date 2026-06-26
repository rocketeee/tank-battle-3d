class_name PackBallistics
extends RefCounted

## Ballistics: Sniper, Barrage, Ricochet, Reaper evolution

static func register() -> void:
	# --- SNIPER ---
	UpgradeRegistry.register_skill({
		"id": "sniper",
		"name": "狙击",
		"icon": "🎯",
		"trigger": "button",
		"base_cooldown": 7.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var aim: Vector3 = api.ground_aim.call()
			var dir := (aim - pos).normalized()
			var dmg: float = api.stats.damage * (3.0 + lvl * 1.0)
			api.spawn_bullet.call({
				"pos": pos + Vector3.UP * 1.2,
				"dir": dir,
				"speed": api.stats.bullet_speed * 2.0,
				"damage": dmg,
				"color": Color(1.0, 0.2, 0.2),
				"size": api.stats.bullet_size * 1.5,
				"life": 2.0,
				"effect": { "pierce": 2, "bonus_crit_chance": 0.3 },
			})
			api.audio.call("play_skill", 180.0)
	})
	UpgradeRegistry.register_upgrade({
		"id": "sniper",
		"name": "狙击",
		"icon": "🎯",
		"desc": func(lvl: int) -> String: return "高伤穿甲弹，%d%% 伤害 + 30%% 额外暴击" % int((3.0 + lvl * 1.0) * 100),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["ballistic", "offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "sniper" not in run.owned_skills:
				run.owned_skills.append("sniper")
	})

	# --- BARRAGE (rapid fire burst) ---
	UpgradeRegistry.register_skill({
		"id": "barrage",
		"name": "弹幕",
		"icon": "💣",
		"trigger": "button",
		"base_cooldown": 9.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var aim: Vector3 = api.ground_aim.call()
			var base_dir := (aim - pos).normalized()
			var count := 8 + lvl * 4
			var dmg: float = api.stats.damage * 0.3
			for i in count:
				var spread := (randf() - 0.5) * 0.3
				var up_spread := (randf() - 0.5) * 0.15
				var dir := (base_dir + Vector3(spread, up_spread, spread * 0.5)).normalized()
				api.spawn_bullet.call({
					"pos": pos + Vector3.UP * 1.2,
					"dir": dir,
					"speed": api.stats.bullet_speed * (0.9 + randf() * 0.3),
					"damage": dmg,
					"color": Color(1.0, 0.8, 0.3),
					"size": api.stats.bullet_size * 0.7,
				})
			api.audio.call("play_shoot")
	})
	UpgradeRegistry.register_upgrade({
		"id": "barrage",
		"name": "弹幕",
		"icon": "💣",
		"desc": func(lvl: int) -> String: return "向前方倾泻 %d 发子弹" % (8 + lvl * 4),
		"rarity": "common",
		"kind": "skill",
		"tags": ["ballistic"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "barrage" not in run.owned_skills:
				run.owned_skills.append("barrage")
	})

	# --- RICOCHET (bouncing bullets) ---
	UpgradeRegistry.register_skill({
		"id": "ricochet",
		"name": "跳弹环",
		"icon": "🔄",
		"trigger": "auto",
		"base_cooldown": 4.0,
		"max_level": 3,
		"cast": func(api: Dictionary, lvl: int) -> void:
			var pos: Vector3 = api.player_pos.call()
			var count := 3 + lvl
			var dmg: float = api.stats.damage * 0.5
			for i in count:
				var angle := float(i) / float(count) * TAU
				var dir := Vector3(sin(angle), 0.1, cos(angle)).normalized()
				api.spawn_bullet.call({
					"pos": pos + Vector3.UP * 1.0,
					"dir": dir,
					"speed": api.stats.bullet_speed * 0.8,
					"damage": dmg,
					"color": Color(0.6, 0.9, 1.0),
					"size": api.stats.bullet_size,
					"effect": { "pierce": lvl },
				})
	})
	UpgradeRegistry.register_upgrade({
		"id": "ricochet",
		"name": "跳弹环",
		"icon": "🔄",
		"desc": func(lvl: int) -> String: return "发射 %d 颗穿透弹在周围弹跳" % (3 + lvl),
		"rarity": "rare",
		"kind": "skill",
		"tags": ["ballistic"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			if "ricochet" not in run.owned_skills:
				run.owned_skills.append("ricochet")
	})

	# --- REAPER EVOLUTION ---
	UpgradeRegistry.register_upgrade({
		"id": "reaper_evo",
		"name": "死神进化",
		"icon": "💀",
		"desc": func(_lvl: int) -> String: return "狙击 + 弹幕 → 死神：暴击触发连锁处决",
		"rarity": "legendary",
		"kind": "evolution",
		"tags": ["ballistic"],
		"max_level": 1,
		"available": func(run: RunState) -> bool:
			return run.has_skill("sniper") and run.has_skill("barrage"),
		"apply": func(run: RunState, _lvl: int) -> void:
			run.upgrade_levels["reaper_evo"] = 1
	})
