class_name PackPassives
extends RefCounted

## Passive upgrade cards: stat boosts, regen, crit, etc.

static func register() -> void:
	# --- HP UP ---
	UpgradeRegistry.register_upgrade({
		"id": "hp_up",
		"name": "装甲强化",
		"icon": "❤️",
		"desc": func(lvl: int) -> String: return "最大生命值 +%d%%" % (lvl * 15),
		"rarity": "common",
		"kind": "passive",
		"tags": ["defense"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.hp_stacks += 1
	})

	# --- DAMAGE UP ---
	UpgradeRegistry.register_upgrade({
		"id": "damage_up",
		"name": "火力升级",
		"icon": "⚔️",
		"desc": func(lvl: int) -> String: return "伤害 +%d%%" % (lvl * 12),
		"rarity": "common",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.damage_stacks += 1
	})

	# --- FIRE RATE UP ---
	UpgradeRegistry.register_upgrade({
		"id": "fire_rate_up",
		"name": "射速提升",
		"icon": "🔫",
		"desc": func(lvl: int) -> String: return "射速 +%d%%" % (lvl * 10),
		"rarity": "common",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.fire_rate_stacks += 1
	})

	# --- SPEED UP ---
	UpgradeRegistry.register_upgrade({
		"id": "speed_up",
		"name": "引擎增压",
		"icon": "🏃",
		"desc": func(lvl: int) -> String: return "移动速度 +%d%%" % (lvl * 10),
		"rarity": "common",
		"kind": "passive",
		"tags": ["mobility"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.speed_stacks += 1
	})

	# --- CRIT CHANCE ---
	UpgradeRegistry.register_upgrade({
		"id": "crit_chance",
		"name": "精密瞄具",
		"icon": "🎯",
		"desc": func(lvl: int) -> String: return "暴击率 +%d%%" % (lvl * 8),
		"rarity": "rare",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 4,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.crit_chance_stacks += 1
	})

	# --- CRIT MULT ---
	UpgradeRegistry.register_upgrade({
		"id": "crit_mult",
		"name": "致命打击",
		"icon": "💀",
		"desc": func(lvl: int) -> String: return "暴击伤害 +%d%%" % (lvl * 25),
		"rarity": "rare",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 4,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.crit_mult_stacks += 1
	})

	# --- REGEN ---
	UpgradeRegistry.register_upgrade({
		"id": "regen",
		"name": "纳米修复",
		"icon": "💊",
		"desc": func(lvl: int) -> String: return "每秒恢复 %0.1f HP" % (lvl * 0.6),
		"rarity": "rare",
		"kind": "passive",
		"tags": ["defense"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.regen_stacks += 1
	})

	# --- CDR ---
	UpgradeRegistry.register_upgrade({
		"id": "cdr",
		"name": "冷却缩减",
		"icon": "⏱️",
		"desc": func(lvl: int) -> String: return "技能冷却 -%d%%" % (lvl * 10),
		"rarity": "rare",
		"kind": "passive",
		"tags": ["utility"],
		"max_level": 4,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.cdr_stacks += 1
	})

	# --- AREA ---
	UpgradeRegistry.register_upgrade({
		"id": "area_up",
		"name": "范围扩展",
		"icon": "🌀",
		"desc": func(lvl: int) -> String: return "技能范围 +%d%%" % (lvl * 12),
		"rarity": "common",
		"kind": "passive",
		"tags": ["utility"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.area_stacks += 1
	})

	# --- BULLET SIZE ---
	UpgradeRegistry.register_upgrade({
		"id": "bullet_size_up",
		"name": "大口径弹药",
		"icon": "🔴",
		"desc": func(lvl: int) -> String: return "弹体大小 +%d%%" % (lvl * 15),
		"rarity": "common",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 4,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.bullet_size_stacks += 1
	})

	# --- PIERCE ---
	UpgradeRegistry.register_upgrade({
		"id": "pierce",
		"name": "穿甲弹",
		"icon": "🔩",
		"desc": func(lvl: int) -> String: return "子弹穿透 +%d" % lvl,
		"rarity": "rare",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 3,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.pierce_stacks += 1
	})

	# --- BULLET SPEED ---
	UpgradeRegistry.register_upgrade({
		"id": "bullet_speed_up",
		"name": "高速弹药",
		"icon": "💨",
		"desc": func(lvl: int) -> String: return "弹速 +%d%%" % (lvl * 8),
		"rarity": "common",
		"kind": "passive",
		"tags": ["offense"],
		"max_level": 5,
		"apply": func(run: RunState, _lvl: int) -> void:
			run.stats.bullet_speed_stacks += 1
	})
