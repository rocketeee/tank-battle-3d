class_name MainMenu
extends CanvasLayer

## Title screen / main menu

signal start_game
signal open_settings

var _root: Control

func _ready() -> void:
	layer = 30
	_build_ui()

func _build_ui() -> void:
	# Background
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.05, 0.05, 0.08, 0.95)
	add_child(bg)

	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 16)
	center.add_child(vbox)

	# Title
	var title := Label.new()
	title.text = "萌坦大战"
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	# Subtitle
	var subtitle := Label.new()
	subtitle.text = "ROGUELIKE"
	subtitle.add_theme_font_size_override("font_size", 20)
	subtitle.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(subtitle)

	# Spacer
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 20
	vbox.add_child(spacer)

	# Description
	var desc := Label.new()
	desc.text = "森林 · 沙漠 · 外星球 — 三大战场\n🛡️ 初始仅护盾 → 击杀升级 → 三选一技能卡\n火/冰/雷 build · 技能进化 · Boss 挑战"
	desc.add_theme_font_size_override("font_size", 14)
	desc.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8))
	desc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(desc)

	# Spacer
	var spacer2 := Control.new()
	spacer2.custom_minimum_size.y = 20
	vbox.add_child(spacer2)

	# Start button
	var start_btn := Button.new()
	start_btn.text = "开始游戏"
	start_btn.custom_minimum_size = Vector2(200, 50)
	start_btn.add_theme_font_size_override("font_size", 22)
	var start_style := StyleBoxFlat.new()
	start_style.bg_color = Color(0.2, 0.6, 0.3)
	start_style.corner_radius_top_left = 8
	start_style.corner_radius_top_right = 8
	start_style.corner_radius_bottom_left = 8
	start_style.corner_radius_bottom_right = 8
	start_btn.add_theme_stylebox_override("normal", start_style)
	var start_hover := start_style.duplicate()
	start_hover.bg_color = Color(0.25, 0.7, 0.35)
	start_btn.add_theme_stylebox_override("hover", start_hover)
	start_btn.pressed.connect(func(): start_game.emit())
	start_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vbox.add_child(start_btn)

	# Settings button
	var settings_btn := Button.new()
	settings_btn.text = "⚙ 设置"
	settings_btn.custom_minimum_size = Vector2(140, 36)
	settings_btn.add_theme_font_size_override("font_size", 16)
	var settings_style := StyleBoxFlat.new()
	settings_style.bg_color = Color(0.25, 0.25, 0.3)
	settings_style.corner_radius_top_left = 6
	settings_style.corner_radius_top_right = 6
	settings_style.corner_radius_bottom_left = 6
	settings_style.corner_radius_bottom_right = 6
	settings_btn.add_theme_stylebox_override("normal", settings_style)
	settings_btn.pressed.connect(func(): open_settings.emit())
	settings_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vbox.add_child(settings_btn)

	# Controls hint
	var controls := Label.new()
	controls.text = "📱 左半屏=移动 · 右半屏=视角 · 右下角=技能\n⚙ 设置：灵敏度/陀螺仪"
	controls.add_theme_font_size_override("font_size", 11)
	controls.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(controls)

func show_menu() -> void:
	visible = true

func hide_menu() -> void:
	visible = false
