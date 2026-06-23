class_name TouchLook
extends Control

## Right-side touch area for camera look + floating visual indicator

signal look_input(delta: Vector2)

@export var sensitivity: float = 0.003

var _active_touch: int = -1
var _last_pos := Vector2.ZERO
var _indicator: TextureRect
var _indicator_origin := Vector2.ZERO

func _ready() -> void:
	# Indicator dot
	_indicator = TextureRect.new()
	_indicator.custom_minimum_size = Vector2(40, 40)
	_indicator.visible = false
	_indicator.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_indicator)
	_draw_circle(_indicator, 20, Color(1, 1, 1, 0.25))

	# Cover right half
	anchor_left = 0.5
	anchor_right = 1.0
	anchor_top = 0.0
	anchor_bottom = 1.0

func _draw_circle(target: TextureRect, radius: float, color: Color) -> void:
	var size_px := int(radius * 2)
	var img := Image.create(size_px, size_px, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(radius, radius)
	for y in size_px:
		for x in size_px:
			if Vector2(x, y).distance_to(center) < radius:
				img.set_pixel(x, y, color)
	target.texture = ImageTexture.create_from_image(img)

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			var vp_size := get_viewport_rect().size
			if touch.position.x > vp_size.x * 0.55 and _active_touch == -1:
				# Check not on a button
				_active_touch = touch.index
				_last_pos = touch.position
				_indicator.visible = true
				_indicator.position = touch.position - _indicator.custom_minimum_size * 0.5
		elif touch.index == _active_touch:
			_active_touch = -1
			_indicator.visible = false

	elif event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		if drag.index == _active_touch:
			var delta := drag.position - _last_pos
			_last_pos = drag.position
			_indicator.position = drag.position - _indicator.custom_minimum_size * 0.5
			var sens := sensitivity * SettingsManager.right_stick_sens
			look_input.emit(delta * sens)

	# Mouse support for desktop testing
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		var motion := event as InputEventMouseMotion
		var sens := sensitivity * SettingsManager.right_stick_sens
		look_input.emit(motion.relative * sens)
