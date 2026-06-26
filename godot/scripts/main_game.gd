extends Node3D

## Main game scene — orchestrates all systems

# Child nodes (assigned in _ready or built dynamically)
var camera: Camera3D
var arena: ArenaBuilder
var vfx: VFXManager
var player: TankPlayer
var hud: GameHUD
var card_ui: CardSelectUI
var main_menu: MainMenu
var settings_panel: SettingsPanel
var move_joystick: FloatingJoystick
var touch_look: TouchLook

# Game state
var run := RunState.new()
var active_skills: Dictionary = {}  # id -> SkillDefs
var enemies: Array[EnemyBase] = []
var boss: BossEnemy = null
var bullets_node: Node3D
var levels: Array[LevelConfig]
var wave_timer: float = 0.0
var intro_timer: float = 0.0

func _ready() -> void:
	# Register all upgrades
	RegisterAll.ensure_registered()
	levels = LevelConfig.get_levels()

	# Build scene structure
	_build_scene()
	_connect_signals()

	# Show menu
	GameManager.state = GameManager.State.MENU
	main_menu.show_menu()

func _build_scene() -> void:
	# Camera
	camera = Camera3D.new()
	camera.fov = 60
	camera.near = 0.1
	camera.far = 220
	camera.position = Vector3(0, 8, 12)
	camera.current = true
	add_child(camera)

	# Arena builder
	arena = ArenaBuilder.new()
	add_child(arena)

	# VFX manager
	vfx = VFXManager.new()
	add_child(vfx)

	# Player tank
	player = TankPlayer.new()
	player.camera_pivot = camera
	var player_col := CollisionShape3D.new()
	var player_shape := CapsuleShape3D.new()
	player_shape.radius = 0.8
	player_shape.height = 2.0
	player_col.shape = player_shape
	player_col.position.y = 1.0
	player.add_child(player_col)
	player.collision_layer = 2  # player layer
	player.collision_mask = 1 | 4  # environment + enemy

	# Player visual (textured tank body)
	_build_player_visual(player)

	add_child(player)

	# Bullets container
	bullets_node = Node3D.new()
	bullets_node.name = "Bullets"
	add_child(bullets_node)

	# UI layers
	hud = GameHUD.new()
	add_child(hud)

	card_ui = CardSelectUI.new()
	add_child(card_ui)

	main_menu = MainMenu.new()
	add_child(main_menu)

	settings_panel = SettingsPanel.new()
	add_child(settings_panel)

	# Touch input controls (added to HUD layer for proper touch handling)
	move_joystick = FloatingJoystick.new()
	move_joystick.side = "left"
	hud.add_child(move_joystick)

	touch_look = TouchLook.new()
	hud.add_child(touch_look)

func _build_player_visual(p: TankPlayer) -> void:
	# Tank body — box with textured PBR material
	var body := MeshInstance3D.new()
	var body_mesh := BoxMesh.new()
	body_mesh.size = Vector3(1.8, 0.8, 2.4)
	body.mesh = body_mesh
	body.position.y = 0.6

	var body_mat := StandardMaterial3D.new()
	body_mat.albedo_color = Color(0.3, 0.6, 0.25)
	body_mat.roughness = 0.6
	body_mat.metallic = 0.3
	# Noise texture for camo pattern
	var noise_tex := NoiseTexture2D.new()
	var noise := FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_CELLULAR
	noise.frequency = 0.12
	noise_tex.noise = noise
	noise_tex.width = 256
	noise_tex.height = 256
	body_mat.albedo_texture = noise_tex
	body_mat.uv1_scale = Vector3(2, 2, 2)
	body.material_override = body_mat
	p.add_child(body)
	p.body_mesh = body

	# Turret — smaller box on top
	var turret := MeshInstance3D.new()
	var turret_mesh := BoxMesh.new()
	turret_mesh.size = Vector3(1.2, 0.5, 1.2)
	turret.mesh = turret_mesh
	turret.position.y = 1.3

	var turret_mat := StandardMaterial3D.new()
	turret_mat.albedo_color = Color(0.25, 0.5, 0.2)
	turret_mat.roughness = 0.5
	turret_mat.metallic = 0.4
	turret_mat.albedo_texture = noise_tex
	turret_mat.uv1_scale = Vector3(3, 3, 3)
	turret.material_override = turret_mat
	p.add_child(turret)
	p.turret_mesh = turret

	# Barrel — cylinder
	var barrel := MeshInstance3D.new()
	var barrel_mesh := CylinderMesh.new()
	barrel_mesh.top_radius = 0.1
	barrel_mesh.bottom_radius = 0.12
	barrel_mesh.height = 2.5
	barrel.mesh = barrel_mesh
	barrel.position = Vector3(0, 1.3, -1.5)
	barrel.rotation.x = PI / 2.0

	var barrel_mat := StandardMaterial3D.new()
	barrel_mat.albedo_color = Color(0.3, 0.3, 0.3)
	barrel_mat.roughness = 0.3
	barrel_mat.metallic = 0.8
	barrel.material_override = barrel_mat
	p.add_child(barrel)
	p.barrel_mesh = barrel

	# Muzzle marker
	var muzzle := Marker3D.new()
	muzzle.position = Vector3(0, 1.3, -2.8)
	p.add_child(muzzle)
	p.muzzle_marker = muzzle

	# Shield visual (transparent sphere)
	var shield_vis := MeshInstance3D.new()
	var shield_mesh := SphereMesh.new()
	shield_mesh.radius = 2.0
	shield_mesh.height = 4.0
	shield_vis.mesh = shield_mesh
	shield_vis.position.y = 1.0
	var shield_mat := StandardMaterial3D.new()
	shield_mat.albedo_color = Color(0.3, 0.6, 1.0, 0.25)
	shield_mat.emission_enabled = true
	shield_mat.emission = Color(0.3, 0.5, 1.0)
	shield_mat.emission_energy_multiplier = 1.5
	shield_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	shield_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	shield_vis.material_override = shield_mat
	shield_vis.visible = false
	p.add_child(shield_vis)
	p.shield_visual = shield_vis

	# Tracks (two thin boxes on sides)
	for side in [-1.0, 1.0]:
		var track := MeshInstance3D.new()
		var track_mesh := BoxMesh.new()
		track_mesh.size = Vector3(0.3, 0.4, 2.6)
		track.mesh = track_mesh
		track.position = Vector3(side * 1.0, 0.35, 0)
		var track_mat := StandardMaterial3D.new()
		track_mat.albedo_color = Color(0.2, 0.2, 0.2)
		track_mat.roughness = 0.9
		track_mat.metallic = 0.1
		track.material_override = track_mat
		p.add_child(track)

func _connect_signals() -> void:
	main_menu.start_game.connect(_on_start_game)
	main_menu.open_settings.connect(func(): settings_panel.show_panel())
	settings_panel.closed.connect(func(): pass)
	card_ui.card_selected.connect(_on_card_selected)
	player.died.connect(_on_player_died)
	player.took_damage.connect(func(hp: float, max_hp: float): hud.update_hp(hp, max_hp))
	player.healed.connect(func(hp: float, max_hp: float): hud.update_hp(hp, max_hp))
	run.leveling.leveled_up.connect(_on_leveled_up)
	move_joystick.joystick_input.connect(_on_move_input)
	touch_look.look_input.connect(_on_look_input)
	GameManager.score_changed.connect(func(s: int): hud.update_score(s))

func _on_start_game() -> void:
	main_menu.hide_menu()
	_start_run()

func _start_run() -> void:
	# Reset everything
	run.reset()
	GameManager.reset_run()
	player.init_stats(run.stats)
	player.reset_for_run()
	player.position = Vector3.ZERO
	player.cam_yaw = PI
	active_skills.clear()

	# Register initial skill (shield)
	_refresh_active_skills()

	# Build first level
	_load_level(0)

	GameManager.state = GameManager.State.INTRO
	intro_timer = 2.0
	hud.update_hp(player.hp, player.max_hp)
	hud.update_xp(0, run.leveling.xp_to_next())
	hud.show_toast(levels[0].name, 2.0)

func _load_level(idx: int) -> void:
	GameManager.level_index = idx
	GameManager.wave_index = 0
	GameManager.spawns_pending = false
	wave_timer = 0.0
	var config := levels[idx]
	arena.build(config)

	# Clear enemies
	for e in enemies:
		if is_instance_valid(e):
			e.queue_free()
	enemies.clear()
	boss = null

	hud.update_wave(0, config.name)

func _process(delta: float) -> void:
	match GameManager.state:
		GameManager.State.INTRO:
			intro_timer -= delta
			if intro_timer <= 0:
				GameManager.state = GameManager.State.PLAYING
				_spawn_wave()
		GameManager.State.PLAYING:
			_tick_playing(delta)
		GameManager.State.LEVELUP:
			pass  # waiting for card select
		GameManager.State.CLEARED:
			wave_timer -= delta
			if wave_timer <= 0:
				_next_level_or_victory()
		GameManager.State.GAMEOVER:
			pass
		GameManager.State.VICTORY:
			pass

	# Tick active auto-skills
	if GameManager.state == GameManager.State.PLAYING:
		_tick_skills(delta)

	# Gyroscope input
	if SettingsManager.gyro_enabled:
		_process_gyro(delta)

	# WASD for desktop
	_process_keyboard()

	# Update HUD cooldowns
	for sid in active_skills:
		var skill: SkillDefs = active_skills[sid]
		hud.update_skill_cooldown(sid, skill.cooldown_fraction())

func _tick_playing(delta: float) -> void:
	# Check wave clear
	var alive_enemies := enemies.filter(func(e: EnemyBase): return is_instance_valid(e) and e.alive)
	enemies = alive_enemies

	# Auto-fire
	if player.can_fire() and GameManager.state == GameManager.State.PLAYING:
		# Fire button handling is in _on_fire_pressed or auto via HUD
		pass

	# XP bar update
	hud.update_xp(run.leveling.xp, run.leveling.xp_to_next())

	# Check wave complete
	if enemies.is_empty() and not GameManager.spawns_pending:
		var config := levels[GameManager.level_index]
		if GameManager.wave_index < config.waves.size():
			GameManager.spawns_pending = true
			wave_timer = 2.0
		elif boss == null:
			_spawn_boss()
		elif not boss.alive:
			GameManager.state = GameManager.State.CLEARED
			wave_timer = 3.0
			GameManager.level_cleared.emit(GameManager.level_index)
			hud.show_toast("关卡通过!", 3.0)

	# Drive the inter-wave delay here instead of a one-shot timer so a level-up
	# pausing PLAYING can never drop the pending wave (the countdown simply
	# resumes when the player returns from card selection).
	if GameManager.spawns_pending:
		wave_timer -= delta
		if wave_timer <= 0.0:
			_spawn_wave()

func _spawn_wave() -> void:
	var config := levels[GameManager.level_index]
	if GameManager.wave_index >= config.waves.size():
		return

	var wave_def: Dictionary = config.waves[GameManager.wave_index]
	var alien_count: int = wave_def.get("aliens", 4)
	var ufo_count: int = wave_def.get("ufos", 1)

	hud.update_wave(GameManager.wave_index, config.name)
	GameManager.wave_started.emit(GameManager.wave_index, GameManager.level_index)

	# Spawn aliens
	for i in alien_count:
		var e := _create_enemy("alien", config.hp_scale)
		enemies.append(e)
		add_child(e)

	# Spawn UFOs
	for i in ufo_count:
		var e := _create_enemy("ufo", config.hp_scale)
		enemies.append(e)
		add_child(e)

	GameManager.wave_index += 1
	GameManager.spawns_pending = false

func _create_enemy(kind: String, hp_scale: float) -> EnemyBase:
	var enemy := EnemyBase.new()
	enemy.kind = kind

	match kind:
		"alien":
			enemy.base_hp = 40.0
			enemy.move_speed = 4.0
			enemy.attack_range = 3.0
			enemy.attack_damage = 8.0
			enemy.head_y = 2.0
		"ufo":
			enemy.base_hp = 60.0
			enemy.move_speed = 3.0
			enemy.attack_range = 12.0
			enemy.attack_damage = 12.0
			enemy.head_y = 2.5

	enemy.init(hp_scale)
	enemy.target = player

	# Random spawn position around arena edge
	var angle := randf() * TAU
	var dist := randf_range(20.0, 26.0)
	enemy.position = Vector3(sin(angle) * dist, 0, cos(angle) * dist)

	# Collision
	var col := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = enemy.body_radius
	shape.height = enemy.head_y
	col.shape = shape
	col.position.y = enemy.head_y * 0.5
	enemy.add_child(col)
	enemy.collision_layer = 4  # enemy layer
	enemy.collision_mask = 1   # environment only

	# Visual
	_build_enemy_visual(enemy)

	# Connect death signal
	enemy.died.connect(_on_enemy_died)

	return enemy

func _build_enemy_visual(enemy: EnemyBase) -> void:
	var mesh := MeshInstance3D.new()
	match enemy.kind:
		"alien":
			# Capsule body — grey/green alien
			var capsule := CapsuleMesh.new()
			capsule.radius = 0.6
			capsule.height = 2.0
			mesh.mesh = capsule
			mesh.position.y = 1.0

			var mat := StandardMaterial3D.new()
			mat.albedo_color = Color(0.4, 0.5, 0.4)
			mat.roughness = 0.7
			mat.metallic = 0.2
			# Noise texture for alien skin
			var noise_tex := NoiseTexture2D.new()
			var noise := FastNoiseLite.new()
			noise.frequency = 0.2
			noise_tex.noise = noise
			noise_tex.width = 128
			noise_tex.height = 128
			mat.albedo_texture = noise_tex
			mat.uv1_scale = Vector3(2, 2, 2)
			mesh.material_override = mat

			# Eyes (two small red spheres)
			for side in [-0.2, 0.2]:
				var eye := MeshInstance3D.new()
				var eye_mesh := SphereMesh.new()
				eye_mesh.radius = 0.1
				eye_mesh.height = 0.2
				eye.mesh = eye_mesh
				eye.position = Vector3(side, 1.5, -0.5)
				var eye_mat := StandardMaterial3D.new()
				eye_mat.albedo_color = Color(1, 0.2, 0.2)
				eye_mat.emission_enabled = true
				eye_mat.emission = Color(1, 0.1, 0.1)
				eye_mat.emission_energy_multiplier = 3.0
				eye.material_override = eye_mat
				mesh.add_child(eye)

		"ufo":
			# Disc body — metallic UFO
			var disc := CylinderMesh.new()
			disc.top_radius = 1.2
			disc.bottom_radius = 1.2
			disc.height = 0.5
			mesh.mesh = disc
			mesh.position.y = 2.0

			var mat := StandardMaterial3D.new()
			mat.albedo_color = Color(0.6, 0.6, 0.7)
			mat.roughness = 0.2
			mat.metallic = 0.8
			mesh.material_override = mat

			# Dome on top
			var dome := MeshInstance3D.new()
			var dome_mesh := SphereMesh.new()
			dome_mesh.radius = 0.6
			dome_mesh.height = 0.8
			dome.mesh = dome_mesh
			dome.position.y = 0.4
			var dome_mat := StandardMaterial3D.new()
			dome_mat.albedo_color = Color(0.5, 0.8, 1.0, 0.6)
			dome_mat.emission_enabled = true
			dome_mat.emission = Color(0.4, 0.6, 1.0)
			dome_mat.emission_energy_multiplier = 2.0
			dome_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			dome.material_override = dome_mat
			mesh.add_child(dome)

			# Bottom glow ring
			var ring := MeshInstance3D.new()
			var ring_mesh := TorusMesh.new()
			ring_mesh.inner_radius = 0.9
			ring_mesh.outer_radius = 1.1
			ring.mesh = ring_mesh
			ring.position.y = -0.2
			var ring_mat := StandardMaterial3D.new()
			ring_mat.albedo_color = Color(0.3, 1.0, 0.5, 0.5)
			ring_mat.emission_enabled = true
			ring_mat.emission = Color(0.2, 0.8, 0.4)
			ring_mat.emission_energy_multiplier = 4.0
			ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			ring.material_override = ring_mat
			mesh.add_child(ring)

	enemy.add_child(mesh)
	enemy.body_mesh = mesh

func _spawn_boss() -> void:
	boss = BossEnemy.new()
	boss.init(levels[GameManager.level_index].hp_scale)
	boss.target = player

	var angle := randf() * TAU
	boss.position = Vector3(sin(angle) * 15.0, 0, cos(angle) * 15.0)

	# Collision
	var col := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 2.0
	shape.height = 4.0
	col.shape = shape
	col.position.y = 2.0
	boss.add_child(col)
	boss.collision_layer = 4
	boss.collision_mask = 1

	# Boss visual — big tank
	_build_boss_visual(boss)

	boss.died.connect(_on_enemy_died)
	enemies.append(boss)
	add_child(boss)

	hud.show_toast("BOSS: %s" % boss.get_boss_name(), 3.0)
	GameManager.boss_spawned.emit()

func _build_boss_visual(b: BossEnemy) -> void:
	# Large armored tank
	var body := MeshInstance3D.new()
	var body_mesh := BoxMesh.new()
	body_mesh.size = Vector3(4.0, 1.8, 5.0)
	body.mesh = body_mesh
	body.position.y = 1.2

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.15, 0.15)
	mat.roughness = 0.4
	mat.metallic = 0.6
	var noise_tex := NoiseTexture2D.new()
	var noise := FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_CELLULAR
	noise.frequency = 0.06
	noise_tex.noise = noise
	noise_tex.width = 256
	noise_tex.height = 256
	mat.albedo_texture = noise_tex
	mat.uv1_scale = Vector3(2, 2, 2)
	body.material_override = mat
	b.add_child(body)

	# Turret
	var turret := MeshInstance3D.new()
	var turret_mesh := BoxMesh.new()
	turret_mesh.size = Vector3(2.5, 1.0, 2.5)
	turret.mesh = turret_mesh
	turret.position.y = 2.5
	var turret_mat := mat.duplicate()
	turret_mat.albedo_color = Color(0.6, 0.1, 0.1)
	turret.material_override = turret_mat
	b.add_child(turret)

	# Twin barrels
	for side in [-0.4, 0.4]:
		var barrel := MeshInstance3D.new()
		var barrel_mesh := CylinderMesh.new()
		barrel_mesh.top_radius = 0.15
		barrel_mesh.bottom_radius = 0.18
		barrel_mesh.height = 4.0
		barrel.mesh = barrel_mesh
		barrel.position = Vector3(side, 2.5, -3.0)
		barrel.rotation.x = PI / 2.0
		var barrel_mat := StandardMaterial3D.new()
		barrel_mat.albedo_color = Color(0.2, 0.2, 0.2)
		barrel_mat.metallic = 0.9
		barrel_mat.roughness = 0.2
		barrel.material_override = barrel_mat
		b.add_child(barrel)

	# Glowing eyes
	for side in [-0.6, 0.6]:
		var eye := MeshInstance3D.new()
		var eye_mesh := SphereMesh.new()
		eye_mesh.radius = 0.2
		eye_mesh.height = 0.4
		eye.mesh = eye_mesh
		eye.position = Vector3(side, 3.2, -1.3)
		var eye_mat := StandardMaterial3D.new()
		eye_mat.albedo_color = Color(1, 0.2, 0.0)
		eye_mat.emission_enabled = true
		eye_mat.emission = Color(1, 0.1, 0.0)
		eye_mat.emission_energy_multiplier = 5.0
		eye.material_override = eye_mat
		b.add_child(eye)

func _on_enemy_died(enemy: EnemyBase) -> void:
	var xp_kind := "boss" if enemy.is_boss else enemy.kind
	run.leveling.add_kill_xp(xp_kind)
	GameManager.add_score(50 if not enemy.is_boss else 500)

	# VFX
	vfx.emit_explosion(enemy.global_position, 2.0 if not enemy.is_boss else 5.0)
	AudioManager.play_explosion()

	if enemy.is_boss:
		GameManager.boss_killed.emit()

func _on_leveled_up(new_level: int) -> void:
	run.leveling.pending_levels -= 1
	AudioManager.play_levelup()

	# Draw cards
	var cards := UpgradeRegistry.draw_cards(run, 3)
	if cards.is_empty():
		return

	GameManager.state = GameManager.State.LEVELUP
	card_ui.show_cards(cards, new_level)

func _on_card_selected(card: Dictionary) -> void:
	run.apply_upgrade(card)
	_refresh_active_skills()

	# Update player stats
	player.max_hp = run.stats.max_hp
	hud.update_hp(player.hp, player.max_hp)
	hud.sync_skill_buttons(run.owned_skills)

	hud.show_toast("%s!" % card.get("name", ""), 1.5)

	if run.leveling.pending_levels > 0:
		# More levels to pick
		_on_leveled_up(run.leveling.level)
	else:
		GameManager.state = GameManager.State.PLAYING

func _refresh_active_skills() -> void:
	active_skills.clear()
	for sid in run.owned_skills:
		var def := UpgradeRegistry.get_skill(sid)
		if not def.is_empty():
			var skill := SkillDefs.new(def)
			skill.level = run.upgrade_levels.get(sid, 1)
			active_skills[sid] = skill
	hud.sync_skill_buttons(run.owned_skills)

func _tick_skills(delta: float) -> void:
	for sid in active_skills:
		var skill: SkillDefs = active_skills[sid]
		skill.tick(delta)
		if skill.trigger == "auto" and skill.is_ready():
			_cast_skill(skill)

func _cast_skill(skill: SkillDefs) -> void:
	var api := _build_api()
	skill.cast(api)

func _build_api() -> Dictionary:
	return {
		"stats": run.stats,
		"run": run,
		"player": player,
		"player_pos": func() -> Vector3: return player.global_position,
		"ground_aim": func() -> Vector3: return player.aim_point,
		"cam_yaw": player.cam_yaw,
		"particles": vfx,
		"audio": AudioManager,
		"enemies": func() -> Array:
			var result: Array[Dictionary] = []
			for e in enemies:
				if is_instance_valid(e) and e.alive:
					result.append({"node": e, "position": e.global_position, "alive": e.alive})
			return result,
		"nearest": func(pos: Vector3, count: int, max_range: float, exclude: Array = []) -> Array:
			var sorted: Array[Dictionary] = []
			for e in enemies:
				if not is_instance_valid(e) or not e.alive:
					continue
				if e in exclude:
					continue
				var dist := pos.distance_to(e.global_position)
				if dist <= max_range:
					sorted.append({"node": e, "position": e.global_position, "dist": dist})
			sorted.sort_custom(func(a: Dictionary, b: Dictionary): return a.dist < b.dist)
			return sorted.slice(0, count),
		"spawn_bullet": func(opts: Dictionary) -> void:
			var b := Bullet.new()
			b.position = opts.get("pos", Vector3.ZERO)
			b.direction = opts.get("dir", Vector3.FORWARD)
			b.speed = opts.get("speed", 40.0)
			b.damage = opts.get("damage", 25.0)
			b.color = opts.get("color", Color(1, 0.8, 0.2))
			b.size = opts.get("size", 0.18)
			b.life = opts.get("life", 3.0)
			b.is_player_bullet = true
			if opts.has("effect"):
				b.effect = opts.effect
			bullets_node.add_child(b),
		"deal_damage": func(target: Variant, amount: float, opts: Dictionary = {}, statuses: Array = []) -> void:
			var node: EnemyBase
			if target is Dictionary:
				node = target.node
			elif target is EnemyBase:
				node = target
			else:
				return
			if not is_instance_valid(node) or not node.alive:
				return
			var result := node.take_damage(amount, opts)
			vfx.emit_hit(node.global_position + Vector3.UP * node.head_y * 0.8, result.crit)
			if result.crit:
				AudioManager.play_hit()
			for s: Dictionary in statuses:
				var type_val: StatusEffect.Type = s.get("type", StatusEffect.Type.BURN)
				node.apply_status(type_val, s.get("dur", 2.0), s.get("potency", 1.0)),
		"deal_aoe": func(pos: Vector3, radius: float, amount: float, opts: Dictionary = {}, statuses: Array = []) -> void:
			for e in enemies:
				if not is_instance_valid(e) or not e.alive:
					continue
				if pos.distance_to(e.global_position) <= radius:
					var result := e.take_damage(amount, opts)
					vfx.emit_hit(e.global_position + Vector3.UP * e.head_y * 0.8, result.crit)
					for s: Dictionary in statuses:
						var type_val: StatusEffect.Type = s.get("type", StatusEffect.Type.BURN)
						e.apply_status(type_val, s.get("dur", 2.0), s.get("potency", 1.0)),
		"apply_status": func(target: Variant, apply: Dictionary) -> void:
			var node: EnemyBase
			if target is Dictionary:
				node = target.node
			elif target is EnemyBase:
				node = target
			else:
				return
			if not is_instance_valid(node):
				return
			var type_str: String = apply.get("type", "burn")
			var type_enum: StatusEffect.Type
			match type_str:
				"burn": type_enum = StatusEffect.Type.BURN
				"chill": type_enum = StatusEffect.Type.CHILL
				"shock": type_enum = StatusEffect.Type.SHOCK
				"mark": type_enum = StatusEffect.Type.MARK
				_: type_enum = StatusEffect.Type.BURN
			node.apply_status(type_enum, apply.get("dur", 2.0), apply.get("potency", 1.0), apply.get("stacks", 1)),
		"toast": func(text: String) -> void: hud.show_toast(text),
	}

func _on_move_input(direction: Vector2) -> void:
	player.move_input = direction * SettingsManager.left_stick_sens

func _on_look_input(delta: Vector2) -> void:
	player.cam_yaw -= delta.x
	var y_mult := -1.0 if SettingsManager.look_invert_y else 1.0
	player.cam_pitch += delta.y * y_mult

func _process_gyro(_delta: float) -> void:
	var gyro := Input.get_gyroscope()
	if gyro.length_squared() < 0.0001:
		return

	# Remap for landscape orientation
	var angle := 0.0
	match DisplayServer.screen_get_orientation():
		DisplayServer.SCREEN_LANDSCAPE:
			angle = 90.0
		DisplayServer.SCREEN_REVERSE_LANDSCAPE:
			angle = 270.0
		DisplayServer.SCREEN_PORTRAIT:
			angle = 0.0
		DisplayServer.SCREEN_REVERSE_PORTRAIT:
			angle = 180.0

	var dx := gyro.y
	var dy := gyro.x
	var rad := deg_to_rad(angle)
	var cos_a := cos(rad)
	var sin_a := sin(rad)
	var yaw := dx * cos_a - dy * sin_a
	var pitch := dx * sin_a + dy * cos_a

	if SettingsManager.gyro_invert_x:
		yaw = -yaw
	if SettingsManager.gyro_invert_y:
		pitch = -pitch

	var sens := SettingsManager.gyro_sens * 0.05
	player.cam_yaw -= yaw * sens
	player.cam_pitch += pitch * sens

func _process_keyboard() -> void:
	# WASD for desktop testing
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_W): dir.y -= 1
	if Input.is_key_pressed(KEY_S): dir.y += 1
	if Input.is_key_pressed(KEY_A): dir.x -= 1
	if Input.is_key_pressed(KEY_D): dir.x += 1
	if dir.length_squared() > 0:
		player.move_input = dir.normalized()

	# J or Space to fire
	if Input.is_physical_key_pressed(KEY_J) or Input.is_physical_key_pressed(KEY_SPACE):
		_fire_main_gun()

	# Number keys for skills
	var skill_keys: Array[Key] = [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5]
	var skill_list: Array[String] = run.owned_skills.duplicate()
	for i in mini(skill_keys.size(), skill_list.size()):
		if Input.is_physical_key_pressed(skill_keys[i]):
			var sid: String = skill_list[i]
			if sid in active_skills:
				var skill: SkillDefs = active_skills[sid]
				if skill.is_ready() and skill.trigger == "button":
					_cast_skill(skill)

func _fire_main_gun() -> void:
	if not player.can_fire() or GameManager.state != GameManager.State.PLAYING:
		return
	player.fire()

	var pos := player.muzzle_world()
	var aim := player.aim_point
	var dir := (aim - pos).normalized()

	var b := Bullet.new()
	b.position = pos
	b.direction = dir
	b.speed = run.stats.bullet_speed
	b.damage = run.stats.damage
	b.size = run.stats.bullet_size
	b.is_player_bullet = true
	if run.stats.pierce > 0:
		b.effect = {"pierce": run.stats.pierce}
	bullets_node.add_child(b)

	AudioManager.play_shoot()
	vfx.emit_hit(pos, false)  # muzzle flash

func _next_level_or_victory() -> void:
	var next := GameManager.level_index + 1
	if next < levels.size():
		_load_level(next)
		GameManager.state = GameManager.State.INTRO
		intro_timer = 2.0
		hud.show_toast(levels[next].name, 2.0)
	else:
		GameManager.state = GameManager.State.VICTORY
		hud.show_toast("胜利！最终得分: %d" % GameManager.score, 5.0)

func _on_player_died() -> void:
	GameManager.state = GameManager.State.GAMEOVER
	GameManager.player_died.emit()
	hud.show_toast("阵亡！得分: %d" % GameManager.score, 5.0)
	# Show restart after delay
	await get_tree().create_timer(3.0).timeout
	main_menu.show_menu()
