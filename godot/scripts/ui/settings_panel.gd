class_name SettingsPanel
extends CanvasLayer

## In-game settings overlay

signal closed

func _ready() -> void:
	layer = 25
	visible = false
	_build_ui()

func _build_ui() -> void:
	# Background
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0, 0, 0, 0.7)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(400, 450)
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.12, 0.12, 0.16, 0.98)
	panel_style.corner_radius_top_left = 12
	panel_style.corner_radius_top_right = 12
	panel_style.corner_radius_bottom_left = 12
	panel_style.corner_radius_bottom_right = 12
	panel_style.border_color = Color(0.3, 0.3, 0.4)
	panel_style.border_width_top = 1
	panel_style.border_width_bottom = 1
	panel_style.border_width_left = 1
	panel_style.border_width_right = 1
	panel.add_theme_stylebox_override("panel", panel_style)
	center.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_bottom", 16)
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	panel.add_child(margin)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(scroll)

	var vbox := VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 10)
	scroll.add_child(vbox)

	# Title
	var title := Label.new()
	title.text = "⚙ 设置"
	title.add_theme_font_size_override("font_size", 22)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	_add_separator(vbox)

	# --- Left Stick Sensitivity ---
	_add_slider(vbox, "左摇杆灵敏度", SettingsManager.left_stick_sens, 0.3, 3.0,
		func(val: float): SettingsManager.left_stick_sens = val; SettingsManager.save_settings())

	# --- Right Stick Sensitivity ---
	_add_slider(vbox, "右摇杆灵敏度", SettingsManager.right_stick_sens, 0.3, 3.0,
		func(val: float): SettingsManager.right_stick_sens = val; SettingsManager.save_settings())

	_add_separator(vbox)

	# --- Gyro Toggle ---
	_add_toggle(vbox, "陀螺仪控制视角", SettingsManager.gyro_enabled,
		func(val: bool): SettingsManager.gyro_enabled = val; SettingsManager.save_settings())

	# --- Gyro Sensitivity ---
	_add_slider(vbox, "陀螺仪灵敏度", SettingsManager.gyro_sens, 0.3, 3.0,
		func(val: float): SettingsManager.gyro_sens = val; SettingsManager.save_settings())

	# --- Gyro Invert X ---
	_add_toggle(vbox, "陀螺仪左右反转", SettingsManager.gyro_invert_x,
		func(val: bool): SettingsManager.gyro_invert_x = val; SettingsManager.save_settings())

	# --- Gyro Invert Y ---
	_add_toggle(vbox, "陀螺仪上下反转", SettingsManager.gyro_invert_y,
		func(val: bool): SettingsManager.gyro_invert_y = val; SettingsManager.save_settings())

	# --- Look Invert Y ---
	_add_toggle(vbox, "视角上下反转（右摇杆）", SettingsManager.look_invert_y,
		func(val: bool): SettingsManager.look_invert_y = val; SettingsManager.save_settings())

	_add_separator(vbox)

	# --- Close button ---
	var close_btn := Button.new()
	close_btn.text = "关闭"
	close_btn.custom_minimum_size = Vector2(120, 36)
	close_btn.add_theme_font_size_override("font_size", 16)
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var close_style := StyleBoxFlat.new()
	close_style.bg_color = Color(0.35, 0.2, 0.2)
	close_style.corner_radius_top_left = 6
	close_style.corner_radius_top_right = 6
	close_style.corner_radius_bottom_left = 6
	close_style.corner_radius_bottom_right = 6
	close_btn.add_theme_stylebox_override("normal", close_style)
	close_btn.pressed.connect(func(): _close())
	vbox.add_child(close_btn)

func _add_slider(parent: VBoxContainer, label_text: String, initial: float, min_val: float, max_val: float, on_change: Callable) -> void:
	var hbox := HBoxContainer.new()
	var label := Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", 14)
	label.custom_minimum_size.x = 160
	hbox.add_child(label)

	var slider := HSlider.new()
	slider.min_value = min_val
	slider.max_value = max_val
	slider.step = 0.05
	slider.value = initial
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.custom_minimum_size.x = 120

	var val_label := Label.new()
	val_label.text = "%0.2fx" % initial
	val_label.add_theme_font_size_override("font_size", 13)
	val_label.custom_minimum_size.x = 50

	slider.value_changed.connect(func(v: float):
		val_label.text = "%0.2fx" % v
		on_change.call(v)
	)

	hbox.add_child(slider)
	hbox.add_child(val_label)
	parent.add_child(hbox)

func _add_toggle(parent: VBoxContainer, label_text: String, initial: bool, on_change: Callable) -> void:
	var hbox := HBoxContainer.new()
	var label := Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", 14)
	label.custom_minimum_size.x = 200
	hbox.add_child(label)

	var toggle := CheckButton.new()
	toggle.button_pressed = initial
	toggle.toggled.connect(func(v: bool): on_change.call(v))
	hbox.add_child(toggle)
	parent.add_child(hbox)

func _add_separator(parent: VBoxContainer) -> void:
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 6)
	parent.add_child(sep)

func show_panel() -> void:
	visible = true
	get_tree().paused = true

func _close() -> void:
	visible = false
	get_tree().paused = false
	closed.emit()
