class_name CardSelectUI
extends CanvasLayer

## Level-up card selection: displays 3 cards, player picks one

signal card_selected(upgrade: Dictionary)

var _panel: PanelContainer
var _cards_container: HBoxContainer
var _title: Label
var _current_cards: Array[Dictionary] = []

func _ready() -> void:
	layer = 20
	visible = false
	_build_ui()

func _build_ui() -> void:
	# Dim background
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0, 0, 0, 0.6)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(bg)

	# Center panel
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 16)
	center.add_child(vbox)

	# Title
	_title = Label.new()
	_title.text = "升级！选择一张卡牌"
	_title.add_theme_font_size_override("font_size", 28)
	_title.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(_title)

	# Cards container
	_cards_container = HBoxContainer.new()
	_cards_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_cards_container.add_theme_constant_override("separation", 12)
	vbox.add_child(_cards_container)

func show_cards(cards: Array[Dictionary], player_level: int) -> void:
	_current_cards = cards
	_title.text = "升级 Lv.%d — 选择一张" % player_level
	visible = true

	# Clear old cards
	for child in _cards_container.get_children():
		child.queue_free()

	# Build card buttons
	for i in cards.size():
		var card := cards[i]
		var card_btn := _build_card(card, i)
		_cards_container.add_child(card_btn)

func _build_card(card: Dictionary, index: int) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(180, 240)

	# Background style
	var style := StyleBoxFlat.new()
	var rarity: String = card.get("rarity", "common")
	var rarity_color: Color = UpgradeRegistry.RARITY_COLOR.get(rarity, Color.WHITE)
	style.bg_color = Color(0.1, 0.1, 0.15, 0.95)
	style.border_color = rarity_color
	style.border_width_top = 3
	style.border_width_bottom = 3
	style.border_width_left = 3
	style.border_width_right = 3
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 8)
	panel.add_child(vbox)

	# Rarity label
	var rarity_label := Label.new()
	rarity_label.text = UpgradeRegistry.RARITY_LABEL.get(rarity, "普通")
	rarity_label.add_theme_font_size_override("font_size", 11)
	rarity_label.add_theme_color_override("font_color", rarity_color)
	rarity_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(rarity_label)

	# Icon
	var icon_label := Label.new()
	icon_label.text = card.get("icon", "?")
	icon_label.add_theme_font_size_override("font_size", 40)
	icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(icon_label)

	# Name
	var name_label := Label.new()
	name_label.text = card.get("name", "???")
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(name_label)

	# Description
	var desc_label := Label.new()
	var lvl: int = 1  # next level
	if card.has("desc") and card.desc is Callable:
		desc_label.text = card.desc.call(lvl)
	else:
		desc_label.text = ""
	desc_label.add_theme_font_size_override("font_size", 12)
	desc_label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.8))
	desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.custom_minimum_size.x = 160
	vbox.add_child(desc_label)

	# Kind tag
	var kind_label := Label.new()
	var kind: String = card.get("kind", "passive")
	match kind:
		"skill": kind_label.text = "【主动技能】"
		"passive": kind_label.text = "【被动】"
		"synergy": kind_label.text = "【协同】"
		"evolution": kind_label.text = "【进化】"
	kind_label.add_theme_font_size_override("font_size", 10)
	kind_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	kind_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(kind_label)

	# Make clickable
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	btn.mouse_filter = Control.MOUSE_FILTER_STOP
	btn.pressed.connect(func(): _on_card_pressed(index))
	panel.add_child(btn)

	return panel

func _on_card_pressed(index: int) -> void:
	if index >= 0 and index < _current_cards.size():
		var card := _current_cards[index]
		visible = false
		card_selected.emit(card)

func hide_cards() -> void:
	visible = false
