extends Node

## Persistent player settings (saved to user://settings.cfg)

signal settings_changed

const SAVE_PATH := "user://settings.cfg"

# Joystick / look
var left_stick_sens: float = 1.0
var right_stick_sens: float = 1.0

# Gyroscope
var gyro_enabled: bool = false
var gyro_sens: float = 1.0
var gyro_invert_x: bool = true   # landscape yaw default inverted
var gyro_invert_y: bool = true   # landscape pitch default inverted

# Look inversion (right stick)
var look_invert_y: bool = false

# Audio
var master_volume: float = 1.0
var sfx_volume: float = 1.0

func _ready() -> void:
	load_settings()

func save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("input", "left_stick_sens", left_stick_sens)
	cfg.set_value("input", "right_stick_sens", right_stick_sens)
	cfg.set_value("input", "gyro_enabled", gyro_enabled)
	cfg.set_value("input", "gyro_sens", gyro_sens)
	cfg.set_value("input", "gyro_invert_x", gyro_invert_x)
	cfg.set_value("input", "gyro_invert_y", gyro_invert_y)
	cfg.set_value("input", "look_invert_y", look_invert_y)
	cfg.set_value("audio", "master_volume", master_volume)
	cfg.set_value("audio", "sfx_volume", sfx_volume)
	cfg.save(SAVE_PATH)
	settings_changed.emit()

func load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return
	left_stick_sens = cfg.get_value("input", "left_stick_sens", 1.0)
	right_stick_sens = cfg.get_value("input", "right_stick_sens", 1.0)
	gyro_enabled = cfg.get_value("input", "gyro_enabled", false)
	gyro_sens = cfg.get_value("input", "gyro_sens", 1.0)
	gyro_invert_x = cfg.get_value("input", "gyro_invert_x", true)
	gyro_invert_y = cfg.get_value("input", "gyro_invert_y", true)
	look_invert_y = cfg.get_value("input", "look_invert_y", false)
	master_volume = cfg.get_value("audio", "master_volume", 1.0)
	sfx_volume = cfg.get_value("audio", "sfx_volume", 1.0)
