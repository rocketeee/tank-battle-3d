extends Node

## Procedural audio engine — generates SFX at runtime (no asset files needed)

var _players: Array[AudioStreamPlayer] = []
const POOL_SIZE := 8

func _ready() -> void:
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)

func _get_free_player() -> AudioStreamPlayer:
	for p in _players:
		if not p.playing:
			return p
	return _players[0]

func play_shoot() -> void:
	_play_tone(220.0, 0.08, 0.6)

func play_hit() -> void:
	_play_tone(440.0, 0.05, 0.4)

func play_explosion() -> void:
	_play_noise(0.25, 0.8)

func play_levelup() -> void:
	_play_tone(523.25, 0.15, 0.5)
	await get_tree().create_timer(0.12).timeout
	_play_tone(659.25, 0.15, 0.5)
	await get_tree().create_timer(0.12).timeout
	_play_tone(783.99, 0.2, 0.5)

func play_pickup() -> void:
	_play_tone(880.0, 0.06, 0.3)

func play_skill(freq: float = 330.0) -> void:
	_play_tone(freq, 0.12, 0.5)

func _play_tone(freq: float, dur: float, vol: float) -> void:
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = 22050.0
	gen.buffer_length = dur + 0.05
	var player := _get_free_player()
	player.stream = gen
	player.volume_db = linear_to_db(vol * SettingsManager.sfx_volume * SettingsManager.master_volume)
	player.play()
	var playback: AudioStreamGeneratorPlayback = player.get_stream_playback()
	var samples := int(dur * gen.mix_rate)
	var phase := 0.0
	var inc := freq / gen.mix_rate
	for i in samples:
		var env := 1.0 - float(i) / float(samples)
		var sample := sin(phase * TAU) * env
		playback.push_frame(Vector2(sample, sample))
		phase += inc

func _play_noise(dur: float, vol: float) -> void:
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = 22050.0
	gen.buffer_length = dur + 0.05
	var player := _get_free_player()
	player.stream = gen
	player.volume_db = linear_to_db(vol * SettingsManager.sfx_volume * SettingsManager.master_volume)
	player.play()
	var playback: AudioStreamGeneratorPlayback = player.get_stream_playback()
	var samples := int(dur * gen.mix_rate)
	for i in samples:
		var env := 1.0 - float(i) / float(samples)
		var sample := (randf() * 2.0 - 1.0) * env
		playback.push_frame(Vector2(sample, sample))
