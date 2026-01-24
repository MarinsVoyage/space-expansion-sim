(function ()
{
  'use strict';

  // Populates a select with options and sets a default selection. For example value lcdm selects LCDM mode.
  function fillSelectWithOptions(_select, _options, _defaultValue)
  {
    _select.innerHTML = '';

    for (let _i = 0; _i < _options.length; _i++)
    {
      const _option = window.SpaceExpansionDom.buildOption(_options[_i].value, _options[_i].label);
      _select.appendChild(_option);
    }

    if (_defaultValue !== undefined && _defaultValue !== null)
    {
      _select.value = String(_defaultValue);
    }
  }

  // Applies numeric slider settings from config to an input element. For example min 0 max 100 value 55.
  function applySliderConfig(_input, _config)
  {
    _input.min = String(_config.min);
    _input.max = String(_config.max);
    _input.value = String(_config.defaultValue);
  }

  // Applies numeric input settings from config. For example box size min 1 step 1 value 1000.
  function applyNumberInputConfig(_input, _config)
  {
    _input.min = String(_config.min);
    _input.step = String(_config.step);
    _input.value = String(_config.defaultValue);
  }

  // Builds and returns references to all UI elements. For example returns modeSelect and speedInput nodes.
  function buildUi(_config)
  {
    const _physicsConfig = _config.physics;
    const _uiConfig = _config.ui;

    // Collects all UI nodes so the app can read and update them. For example statusText is the top status line.
    const _elements =
    {
      statusText: window.SpaceExpansionDom.getElementByIdRequired('statusText'),
      controlsToggleButton: window.SpaceExpansionDom.getElementByIdRequired('controlsToggleButton'),
      controlsPanel: window.SpaceExpansionDom.getElementByIdRequired('controlsPanel'),
      modeSelect: window.SpaceExpansionDom.getElementByIdRequired('modeSelect'),
      renderSelect: window.SpaceExpansionDom.getElementByIdRequired('renderSelect'),
      distributionSelect: window.SpaceExpansionDom.getElementByIdRequired('distributionSelect'),
      speedInput: window.SpaceExpansionDom.getElementByIdRequired('speedInput'),
      timelineInput: window.SpaceExpansionDom.getElementByIdRequired('timelineInput'),
      rangeSelect: window.SpaceExpansionDom.getElementByIdRequired('rangeSelect'),
      densityInput: window.SpaceExpansionDom.getElementByIdRequired('densityInput'),
      boxSizeInput: window.SpaceExpansionDom.getElementByIdRequired('boxSizeInput'),
      boundCheckbox: window.SpaceExpansionDom.getElementByIdRequired('boundCheckbox'),
      measureCheckbox: window.SpaceExpansionDom.getElementByIdRequired('measureCheckbox'),
      playPauseButton: window.SpaceExpansionDom.getElementByIdRequired('playPauseButton'),
      resetButton: window.SpaceExpansionDom.getElementByIdRequired('resetButton'),
      overlay2d: window.SpaceExpansionDom.getElementByIdRequired('overlay2d'),
      overlay3d: window.SpaceExpansionDom.getElementByIdRequired('overlay3d'),
      canvas2d: window.SpaceExpansionDom.getElementByIdRequired('canvas2d'),
      canvas3d: window.SpaceExpansionDom.getElementByIdRequired('canvas3d')
    };

    fillSelectWithOptions(_elements.modeSelect, _physicsConfig.modes, _physicsConfig.defaultMode);
    fillSelectWithOptions(_elements.renderSelect, _uiConfig.renderStyles, _uiConfig.defaultRenderStyle);
    fillSelectWithOptions(_elements.distributionSelect, _uiConfig.distributionModes, _uiConfig.defaultDistributionMode);
    fillSelectWithOptions(_elements.rangeSelect, _physicsConfig.aMaxOptions, _physicsConfig.defaultAMax);

    applySliderConfig(_elements.speedInput, _uiConfig.speedSlider);
    applySliderConfig(_elements.timelineInput, _uiConfig.timelineSlider);
    applySliderConfig(_elements.densityInput, _uiConfig.densitySlider);
    applyNumberInputConfig(_elements.boxSizeInput, _uiConfig.boxSizeMpc);

    // Set checkbox defaults so toggles match config values. For example defaultShowBoundPoints true shows bound points.
    _elements.boundCheckbox.checked = Boolean(_uiConfig.defaultShowBoundPoints);
    _elements.measureCheckbox.checked = Boolean(_uiConfig.defaultMeasureDistance);

    return _elements;
  }

  window.SpaceExpansionAppUI =
  {
    buildUi: buildUi
  };
})();
