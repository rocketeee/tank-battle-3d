class_name LevelConfig
extends Resource

## Level configuration data

@export var id: int = 0
@export var name: String = "森林竞技场"
@export var short_name: String = "森林"
@export var theme: String = "forest"  # forest | desert | alien

# Colors
@export var ground_color: Color = Color(0.37, 0.66, 0.23)
@export var ground_color_2: Color = Color(0.31, 0.58, 0.19)
@export var fog_color: Color = Color(0.62, 0.82, 0.91)
@export var sky_top: Color = Color(0.44, 0.72, 0.91)
@export var sky_bottom: Color = Color(0.81, 0.92, 0.96)
@export var ambient_color: Color = Color(0.75, 0.90, 1.0)
@export var sun_color: Color = Color(1.0, 0.96, 0.84)
@export var sun_intensity: float = 1.5
@export var ambient_intensity: float = 0.75

@export var prop_count: int = 46
@export var hp_scale: float = 1.0

@export var waves: Array[Dictionary] = []

static func get_levels() -> Array[LevelConfig]:
	var levels: Array[LevelConfig] = []

	# Level 0: Forest
	var forest := LevelConfig.new()
	forest.id = 0
	forest.name = "森林竞技场"
	forest.short_name = "森林"
	forest.theme = "forest"
	forest.ground_color = Color(0.37, 0.66, 0.23)
	forest.ground_color_2 = Color(0.31, 0.58, 0.19)
	forest.fog_color = Color(0.62, 0.82, 0.91)
	forest.sky_top = Color(0.44, 0.72, 0.91)
	forest.sky_bottom = Color(0.81, 0.92, 0.96)
	forest.ambient_color = Color(0.75, 0.90, 1.0)
	forest.sun_color = Color(1.0, 0.96, 0.84)
	forest.sun_intensity = 1.5
	forest.ambient_intensity = 0.75
	forest.prop_count = 46
	forest.hp_scale = 1.0
	forest.waves = [
		{"aliens": 4, "ufos": 1},
		{"aliens": 5, "ufos": 2},
		{"aliens": 6, "ufos": 3},
	]
	levels.append(forest)

	# Level 1: Desert
	var desert := LevelConfig.new()
	desert.id = 1
	desert.name = "黄沙沙丘"
	desert.short_name = "沙漠"
	desert.theme = "desert"
	desert.ground_color = Color(0.85, 0.71, 0.40)
	desert.ground_color_2 = Color(0.80, 0.64, 0.35)
	desert.fog_color = Color(0.91, 0.83, 0.63)
	desert.sky_top = Color(0.91, 0.71, 0.36)
	desert.sky_bottom = Color(0.96, 0.89, 0.69)
	desert.ambient_color = Color(1.0, 0.90, 0.69)
	desert.sun_color = Color(1.0, 0.94, 0.75)
	desert.sun_intensity = 1.7
	desert.ambient_intensity = 0.8
	desert.prop_count = 40
	desert.hp_scale = 1.3
	desert.waves = [
		{"aliens": 5, "ufos": 2},
		{"aliens": 6, "ufos": 3},
		{"aliens": 7, "ufos": 4},
	]
	levels.append(desert)

	# Level 2: Alien
	var alien := LevelConfig.new()
	alien.id = 2
	alien.name = "虚空外星基地"
	alien.short_name = "外星球"
	alien.theme = "alien"
	alien.ground_color = Color(0.23, 0.17, 0.36)
	alien.ground_color_2 = Color(0.18, 0.14, 0.31)
	alien.fog_color = Color(0.16, 0.12, 0.28)
	alien.sky_top = Color(0.10, 0.06, 0.19)
	alien.sky_bottom = Color(0.29, 0.17, 0.44)
	alien.ambient_color = Color(0.75, 0.61, 1.0)
	alien.sun_color = Color(0.85, 0.72, 1.0)
	alien.sun_intensity = 1.3
	alien.ambient_intensity = 0.9
	alien.prop_count = 44
	alien.hp_scale = 1.7
	alien.waves = [
		{"aliens": 6, "ufos": 3},
		{"aliens": 7, "ufos": 4},
		{"aliens": 8, "ufos": 5},
	]
	levels.append(alien)

	return levels
