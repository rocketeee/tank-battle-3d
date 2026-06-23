class_name RegisterAll
extends RefCounted

## One-shot registration of all skill + upgrade packs

static var _registered := false

static func ensure_registered() -> void:
	if _registered:
		return
	_registered = true
	PackBase.register()
	PackPassives.register()
	PackFire.register()
	PackIce.register()
	PackLightning.register()
	PackPhysical.register()
	PackSummon.register()
	PackBallistics.register()
	PackFusion.register()
