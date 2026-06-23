class_name GameHUD
extends CanvasLayer

## Heads-up display: HP bar, XP bar, score, wave indicator, skill buttons, crosshair

var hp_bar: ProgressBar
var xp_bar: ProgressBar
var score_label: Label
var wave_label: Label
var level_label: Label
var crosshair: TextureRect
var skill_container: HBoxContainer
var _skill_buttons: Dictionary = {}  # skill_id -> Button
var toast_label: Label
var toast_timer: float = 0.0

# Minimap
var minimap_container: Control

func _ready() -> void:
	layer = 10
	_build_ui()

func _build_ui() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# Safe area margins
	var safe := DisplayServer.get_display_safe_area()
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_top", max(safe.position.y, 8))
	margin.add_theme_constant_override("margin_left", max(safe.position.x, 8))
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_bottom", 8)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(vbox)

	# --- Top bar: HP, XP, score, wave ---
	var top_bar := HBoxContainer.new()
	top_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(top_bar)

	# HP bar
	var hp_vbox := VBoxContainer.new()
	var hp_label := Label.new()
	hp_label.text = "HP"
	hp_label.add_theme_font_size_override("font_size", 12)
	hp_vbox.add_child(hp_label)
	hp_bar = ProgressBar.new()
	hp_bar.custom_minimum_size = Vector2(120, 14)
	hp_bar.max_value = 100
	hp_bar.value = 100
	hp_bar.show_percentage = false
	var hp_style := StyleBoxFlat.new()
	hp_style.bg_color = Color(0.2, 0.8, 0.2)
	hp_style.corner_radius_top_left = 3
	hp_style.corner_radius_top_right = 3
	hp_style.corner_radius_bottom_left = 3
	hp_style.corner_radius_bottom_right = 3
	hp_bar.add_theme_stylebox_override("fill", hp_style)
	hp_vbox.add_child(hp_bar)
	top_bar.add_child(hp_vbox)

	# XP bar
	var xp_vbox := VBoxContainer.new()
	var xp_label := Label.new()
	xp_label.text = "XP"
	xp_label.add_theme_font_size_override("font_size", 12)
	xp_vbox.add_child(xp_label)
	xp_bar = ProgressBar.new()
	xp_bar.custom_minimum_size = Vector2(100, 10)
	xp_bar.max_value = 100
	xp_bar.value = 0
	xp_bar.show_percentage = false
	var xp_style := StyleBoxFlat.new()
	xp_style.bg_color = Color(0.3, 0.5, 1.0)
	xp_style.corner_radius_top_left = 2
	xp_style.corner_radius_top_right = 2
	xp_style.corner_radius_bottom_left = 2
	xp_style.corner_radius_bottom_right = 2
	xp_bar.add_theme_stylebox_override("fill", xp_style)
	xp_vbox.add_child(xp_bar)
	top_bar.add_child(xp_vbox)

	# Spacer
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_bar.add_child(spacer)

	# Score + wave
	var info_vbox := VBoxContainer.new()
	info_vbox.alignment = BoxContainer.ALIGNMENT_END
	score_label = Label.new()
	score_label.text = "0"
	score_label.add_theme_font_size_override("font_size", 16)
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	info_vbox.add_child(score_label)

	wave_label = Label.new()
	wave_label.text = "第 1 波"
	wave_label.add_theme_font_size_override("font_size", 12)
	wave_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	info_vbox.add_child(wave_label)

	level_label = Label.new()
	level_label.text = "森林"
	level_label.add_theme_font_size_override("font_size", 11)
	level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	info_vbox.add_child(level_label)
	top_bar.add_child(info_vbox)

	# --- Center: Crosshair ---
	crosshair = TextureRect.new()
	crosshair.custom_minimum_size = Vector2(32, 32)
	crosshair.set_anchors_preset(Control.PRESET_CENTER)
	crosshair.offset_left = -16
	crosshair.offset_top = -16
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Draw crosshair procedurally
	_draw_crosshair(crosshair)
	root.add_child(crosshair)

	# --- Bottom right: skill buttons ---
	skill_container = HBoxContainer.new()
	skill_container.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	skill_container.anchor_left = 1.0
	skill_container.anchor_right = 1.0
	skill_container.anchor_top = 1.0
	skill_container.anchor_bottom = 1.0
	skill_container.offset_left = -300
	skill_container.offset_top = -80
	skill_container.offset_right = -10
	skill_container.offset_bottom = -10
	skill_container.alignment = BoxContainer.ALIGNMENT_END
	skill_container.add_theme_constant_override("separation", 6)
	root.add_child(skill_container)

	# --- Fire button (always present) ---
	var fire_btn := _create_skill_button("fire", "🔫", Color(1, 0.3, 0.2))
	skill_container.add_child(fire_btn)

	# --- Toast (center notification) ---
	toast_label = Label.new()
	toast_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	toast_label.offset_top = 60
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.add_theme_font_size_override("font_size", 18)
	toast_label.add_theme_color_override("font_color", Color(1, 1, 0.5))
	toast_label.visible = false
	toast_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(toast_label)

func _draw_crosshair(target: TextureRect) -> void:
	var size := 32
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := size / 2
	var color := Color(1, 1, 1, 0.8)
	# Horizontal line
	for x in range(center - 10, center + 11):
		if abs(x - center) > 3:
			img.set_pixel(x, center, color)
	# Vertical line
	for y in range(center - 10, center + 11):
		if abs(y - center) > 3:
			img.set_pixel(center, y, color)
	# Center dot
	img.set_pixel(center, center, Color(1, 0.3, 0.2, 1.0))
	target.texture = ImageTexture.create_from_image(img)

func _create_skill_button(id: String, icon: String, color: Color) -> Button:
	var btn := Button.new()
	btn.text = icon
	btn.custom_minimum_size = Vector2(52, 52)
	btn.add_theme_font_size_override("font_size", 20)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(color.r, color.g, color.b, 0.3)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_color = color
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_width_left = 2
	style.border_width_right = 2
	btn.add_theme_stylebox_override("normal", style)
	btn.name = id
	_skill_buttons[id] = btn
	return btn

func update_hp(current: float, maximum: float) -> void:
	hp_bar.max_value = maximum
	hp_bar.value = current

func update_xp(current: int, needed: int) -> void:
	xp_bar.max_value = needed
	xp_bar.value = current

func update_score(val: int) -> void:
	score_label.text = str(val)

func update_wave(wave: int, level_name: String) -> void:
	wave_label.text = "第 %d 波" % (wave + 1)
	level_label.text = level_name

func show_toast(text: String, dur: float = 2.0) -> void:
	toast_label.text = text
	toast_label.visible = true
	toast_timer = dur

func sync_skill_buttons(owned_skills: Array[String]) -> void:
	# Remove buttons for skills no longer owned (shouldn't happen) and add new ones
	for skill_id in owned_skills:
		if skill_id == "fire":
			continue
		if skill_id not in _skill_buttons:
			var def := UpgradeRegistry.get_skill(skill_id)
			if def.is_empty():
				continue
			var icon: String = def.get("icon", "?")
			var color := Color(0.5, 0.5, 0.5)
			match true:
				def.get("id", "").contains("fire") or def.get("id", "").contains("flame"):
					color = Color(1, 0.4, 0.1)
				def.get("id", "").contains("ice") or def.get("id", "").contains("frost"):
					color = Color(0.3, 0.7, 1.0)
				def.get("id", "").contains("lightning") or def.get("id", "").contains("chain") or def.get("id", "").contains("divine"):
					color = Color(0.9, 0.9, 0.2)
				_:
					color = Color(0.6, 0.6, 0.6)
			var btn := _create_skill_button(skill_id, icon, color)
			skill_container.add_child(btn)

func update_skill_cooldown(skill_id: String, fraction: float) -> void:
	if skill_id in _skill_buttons:
		var btn: Button = _skill_buttons[skill_id]
		btn.modulate.a = 0.4 if fraction > 0 else 1.0

func get_fire_button() -> Button:
	return _skill_buttons.get("fire", null)

func get_skill_button(id: String) -> Button:
	return _skill_buttons.get(id, null)

func _process(delta: float) -> void:
	if toast_timer > 0:
		toast_timer -= delta
		if toast_timer <= 0:
			toast_label.visible = false
