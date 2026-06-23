class_name FloatingJoystick
extends Control

## Touch-activated floating joystick: appears at touch point, follows finger

signal joystick_input(direction: Vector2)

@export var max_radius: float = 60.0
@export var side: String = "left"  # "left" | "right"
@export var deadzone: float = 0.1

var _base: TextureRect
var _knob: TextureRect
var _active_touch: int = -1
var _origin := Vector2.ZERO
var _output := Vector2.ZERO

func _ready() -> void:
	# Create base circle
	_base = TextureRect.new()
	_base.custom_minimum_size = Vector2(max_radius * 2, max_radius * 2)
	_base.visible = false
	_base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_base)

	# Create knob
	_knob = TextureRect.new()
	_knob.custom_minimum_size = Vector2(max_radius * 0.8, max_radius * 0.8)
	_knob.visible = false
	_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_knob)

	# Draw circles procedurally
	_draw_circle_texture(_base, max_radius, Color(1, 1, 1, 0.15))
	_draw_circle_texture(_knob, max_radius * 0.4, Color(1, 1, 1, 0.4))

	# Fill entire side of screen
	anchor_left = 0.0
	anchor_right = 0.5 if side == "left" else 1.0
	anchor_top = 0.0
	anchor_bottom = 1.0
	offset_left = 0.0 if side == "left" else get_viewport_rect().size.x * 0.5
	offset_right = 0.0
	offset_top = 0.0
	offset_bottom = 0.0

func _draw_circle_texture(target: TextureRect, radius: float, color: Color) -> void:
	var size_px := int(radius * 2)
	var img := Image.create(size_px, size_px, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(radius, radius)
	for y in size_px:
		for x in size_px:
			var dist := Vector2(x, y).distance_to(center)
			if dist < radius:
				var alpha := color.a * (1.0 - (dist / radius) * 0.5)
				img.set_pixel(x, y, Color(color.r, color.g, color.b, alpha))
	target.texture = ImageTexture.create_from_image(img)

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			if _is_in_zone(touch.position) and _active_touch == -1:
				_active_touch = touch.index
				_origin = touch.position
				_show_at(_origin)
		elif touch.index == _active_touch:
			_release()

	elif event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		if drag.index == _active_touch:
			var delta := drag.position - _origin
			var dist := delta.length()
			if dist > max_radius:
				delta = delta.normalized() * max_radius
			_output = delta / max_radius
			if _output.length() < deadzone:
				_output = Vector2.ZERO
			_update_knob_pos(delta)
			joystick_input.emit(_output)

func _is_in_zone(pos: Vector2) -> bool:
	var vp_size := get_viewport_rect().size
	if side == "left":
		return pos.x < vp_size.x * 0.45
	else:
		return pos.x > vp_size.x * 0.55

func _show_at(pos: Vector2) -> void:
	_base.visible = true
	_knob.visible = true
	_base.position = pos - _base.custom_minimum_size * 0.5
	_knob.position = pos - _knob.custom_minimum_size * 0.5

func _update_knob_pos(delta: Vector2) -> void:
	_knob.position = _origin + delta - _knob.custom_minimum_size * 0.5

func _release() -> void:
	_active_touch = -1
	_output = Vector2.ZERO
	_base.visible = false
	_knob.visible = false
	joystick_input.emit(Vector2.ZERO)

func get_output() -> Vector2:
	return _output
