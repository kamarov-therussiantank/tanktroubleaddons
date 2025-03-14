import ProxyHelper from '../utils/proxyHelper.js';

QualityManager.QUALITY_SETTINGS.MINIMUM = 'minimum';
QualityManager.QUALITY_VALUES.minimum = {
	'tank explosion smoke count': 0,
	'tank explosion fragment count': 0,
	'missile launch smoke count': 0,
	'missile smoke frequency': 360,
	'crate land dust count': 0,
	'aimer min segment length': 1,
	'aimer off max segment length': 4,
	'aimer on max segment length': 2,
	'bullet puff count': 1,
	'shield inverse bolt probability': 1,
	'shield spark particles per emit': 0,
	'spawn zone inverse unstable particle probability': 1,
	'spawn zone num collapse particles': 0
};
QualityManager.QUALITY_VALUES[QualityManager.QUALITY_SETTINGS.MINIMUM] = {
	'tank explosion smoke count': 1,
	'tank explosion fragment count': 3,
	'missile launch smoke count': 2,
	'missile smoke frequency': 360,
	'mine explosion smoke count': 0,
	'crate land dust count': 2,
	'aimer min segment length': 0.5,
	'aimer off max segment length': 2,
	'aimer on max segment length': 1,
	'bullet puff count': 1,
	'shield inverse bolt probability': 1.0,
	'shield spark particles per emit': 1,
	'spawn zone inverse unstable particle probability': 1.0,
	'spawn zone num collapse particles': 10
};

UIConstants.classField('SETTINGS_QUALITY_MAX_OPTION_HEIGHT', 200);

ProxyHelper.whenContentLoaded().then(() => {
	ProxyHelper.interceptFunction(TankTrouble.SettingsBox, 'init', (original, ...args) => {
		original(...args);

		const minQuality = $(`<option value="${ QualityManager.QUALITY_SETTINGS.MINIMUM }">Minimum</option>`);
		TankTrouble.SettingsBox.settingsQualityOptions.push(minQuality);
		TankTrouble.SettingsBox.settingsQualitySelect.append(minQuality);
	});

	// FIXME: ProxyHelper.interceptFunction does not keep prototype context
	UIRubbleGroup.prototype.emit = function(tank) {
		if (![QualityManager.QUALITY_SETTINGS.LOW, QualityManager.QUALITY_SETTINGS.MINIMUM].includes(QualityManager.getQuality())) {
			if (tank.getSpeed() !== 0.0 || tank.getRotationSpeed() !== 0.0) {
				this.exists = true;
				this.visible = true;
				const rubbleFragmentSprite = this.fragmentGroup.getFirstExists(false);
				if (rubbleFragmentSprite) {
					rubbleFragmentSprite.spawn(UIUtils.mpx(tank.getX()),
						UIUtils.mpx(tank.getY()),
						tank.getRotation(),
						tank.getSpeed());
				}

				this.emitter.emit(UIUtils.mpx(tank.getX()), UIUtils.mpx(tank.getY()), tank.getRotation(), tank.getSpeed());
			}
		}
	};
});

export const _isESmodule = true;
