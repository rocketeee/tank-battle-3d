extends Node

## Central game state machine — orchestrates menu / playing / levelup / victory flow

signal state_changed(new_state: String)
signal score_changed(score: int)
signal wave_started(wave_index: int, level_index: int)
signal level_cleared(level_index: int)
signal player_died
signal boss_spawned
signal boss_killed

enum State { MENU, INTRO, PLAYING, LEVELUP, CLEARED, GAMEOVER, VICTORY }

var state: State = State.MENU:
	set(v):
		state = v
		state_changed.emit(State.keys()[v])

var score: int = 0:
	set(v):
		score = v
		score_changed.emit(v)

var level_index: int = 0
var wave_index: int = 0
var spawns_pending: bool = false

func reset_run() -> void:
	score = 0
	level_index = 0
	wave_index = 0
	spawns_pending = false

func add_score(amount: int) -> void:
	score += amount
