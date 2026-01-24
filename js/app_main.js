(function ()
{
  'use strict';

  // Converts the speed slider value into simulated Gyr per second for usable control. For example 0 maps to min speed.
  function mapSpeedSliderToGyrPerSecond(_speedSliderValue, _speedConfig, _numericSafety)
  {
    // Protects against zero max values so division stays safe. For example max 0 falls back to 1.
    const _maxSliderValue = Math.max(1.0, _speedConfig.max);
    const _t = Math.max(0.0, Math.min(1.0, _speedSliderValue / _maxSliderValue));
    const _minPositiveSpeed =
      (_numericSafety && Number.isFinite(_numericSafety.minPositiveSpeedGyrPerSecond)) ?
        _numericSafety.minPositiveSpeedGyrPerSecond :
        _speedConfig.minGyrPerSecond;

    const _min = Math.max(_minPositiveSpeed, _speedConfig.minGyrPerSecond);
    const _max = Math.max(_min, _speedConfig.maxGyrPerSecond);

    // Exponential interpolation gives finer control at low speeds.
    const _value = _min * Math.pow(_max / _min, _t);
    return _value;
  }

  // Returns the fixed Y slice for the comoving 3D selection overlay. For example center slice at density 10.
  function getComovingSliceYForDensity(_density)
  {
    const _count = Math.max(2, Math.floor(_density));
    const _half = 0.5;
    const _yIndex = Math.floor((_count - 1) * 0.5);
    return -_half + (_yIndex / (_count - 1)) * 1.0;
  }

  // Returns true when the layout is compact for smaller screens. For example 600px wide returns true.
  function isCompactLayout()
  {
    if (typeof window.matchMedia !== 'function')
    {
      return false;
    }

    return window.matchMedia('(max-width: 980px)').matches;
  }

  // Updates pane sizing for narrow screens so panes fill the viewport. For example 800px height splits into two panes.
  function applyResponsivePaneSizing()
  {
    if (typeof window.matchMedia !== 'function')
    {
      return;
    }

    const _isCompact = window.matchMedia('(max-width: 980px)').matches;

    if (!_isCompact)
    {
      document.documentElement.style.removeProperty('--mobile-pane-height');
      return;
    }

    const _topbar = document.querySelector('.topbar');
    const _footer = document.querySelector('.footer');
    const _panes = document.querySelector('.panes');

    if (!_panes)
    {
      return;
    }

    const _topbarHeight = _topbar ? _topbar.getBoundingClientRect().height : 0;
    const _footerHeight = _footer ? _footer.getBoundingClientRect().height : 0;
    const _panesStyles = window.getComputedStyle(_panes);
    const _gapValue = parseFloat(_panesStyles.rowGap || _panesStyles.gap || '0') || 0;
    const _paddingTop = parseFloat(_panesStyles.paddingTop || '0') || 0;
    const _paddingBottom = parseFloat(_panesStyles.paddingBottom || '0') || 0;

    const _availableHeight = Math.max(0, window.innerHeight - _topbarHeight - _footerHeight - _paddingTop - _paddingBottom);
    const _paneHeight = Math.max(0, (_availableHeight - _gapValue) * 0.5);

    document.documentElement.style.setProperty('--mobile-pane-height', Math.floor(_paneHeight) + 'px');
  }

  // Initializes and runs the app after config load. For example create model, renderers, and event hooks.
  function startApp(_config)
  {
    const _ui = window.SpaceExpansionAppUI.buildUi(_config);
    let _controlsCollapsed = isCompactLayout();
    let _hasUserToggledControls = false;

    // Shows a fatal error in the status line so users see what went wrong. For example missing canvas element.
    function showFatalError(_error)
    {
      const _message = (_error && _error.message) ? String(_error.message) : String(_error);
      const _stack = (_error && _error.stack) ? String(_error.stack) : '';

      if (_stack)
      {
        console.error(_stack);
      }
      else
      {
        console.error(_error);
      }

      _ui.statusText.textContent = 'Error ' + _message;
      _ui.statusText.style.color = 'rgba(255, 180, 180, 0.95)';
    }

    window.addEventListener('error', function (_event)
    {
      if (_event && _event.error)
      {
        showFatalError(_event.error);
      }
      else
      {
        showFatalError(_event && _event.message ? _event.message : 'Unknown runtime error');
      }
    });

    window.addEventListener('unhandledrejection', function (_event)
    {
      showFatalError(_event && _event.reason ? _event.reason : 'Unhandled promise rejection');
    });

    // Core simulation objects used across render loops. For example renderer2d draws the 2D pane.
    let _expansionModel;
    let _renderer2d;
    let _renderer3d;

    try
    {
      _expansionModel = new window.SpaceExpansionCosmology.ExpansionModel(_config);
      _expansionModel.setAMax(Number(_ui.rangeSelect.value));

      _renderer2d = new window.SpaceExpansionRenderer2D.ExpansionRenderer2D(_ui.canvas2d, _config);
      _renderer3d = new window.SpaceExpansionRenderer3D.ExpansionRenderer3D(_ui.canvas3d, _config);
    }
    catch (_error)
    {
      showFatalError(_error);
      return;
    }

    _renderer2d.setMaxShownScaleRelative(Number(_ui.rangeSelect.value));
    _renderer3d.setMaxShownScaleRelative(Number(_ui.rangeSelect.value));

    _renderer2d.setRenderStyle(_ui.renderSelect.value);
    _renderer3d.setRenderStyle(_ui.renderSelect.value);
    _renderer2d.setDistributionMode(_ui.distributionSelect.value);
    _renderer3d.setDistributionMode(_ui.distributionSelect.value);

    // Updates the controls panel visibility for compact layout. For example collapsed hides controls on small screens.
    function applyControlsCollapsed(_isCollapsed)
    {
      _controlsCollapsed = _isCollapsed;
      _ui.controlsPanel.classList.toggle('isCollapsed', _controlsCollapsed);
      _ui.controlsToggleButton.setAttribute('aria-expanded', _controlsCollapsed ? 'false' : 'true');
      _ui.controlsToggleButton.textContent = _controlsCollapsed ? 'Show controls' : 'Hide controls';
    }

    applyControlsCollapsed(_controlsCollapsed);
    applyResponsivePaneSizing();

    // Applies the timeline slider value to the model. For example value 0 starts at aMin.
    function applyTimelineFromSlider()
    {
      const _timelineMax = Math.max(1, _config.ui.timelineSlider.max);
      const _normalized = Number(_ui.timelineInput.value) / _timelineMax;
      _expansionModel.setTimelineNormalized(_normalized);
    }

    // Resets UI controls to config defaults and applies them to the model and renderers. For example reset goes to default mode.
    function applyUiDefaults()
    {
      _ui.modeSelect.value = String(_config.physics.defaultMode);
      _ui.renderSelect.value = String(_config.ui.defaultRenderStyle);
      _ui.distributionSelect.value = String(_config.ui.defaultDistributionMode);
      _ui.rangeSelect.value = String(_config.physics.defaultAMax);
      _ui.speedInput.value = String(_config.ui.speedSlider.defaultValue);
      _ui.timelineInput.value = String(_config.ui.timelineSlider.defaultValue);
      _ui.densityInput.value = String(_config.ui.densitySlider.defaultValue);
      _ui.boxSizeInput.value = String(_config.ui.boxSizeMpc.defaultValue);
      _ui.boundCheckbox.checked = Boolean(_config.ui.defaultShowBoundPoints);
      _ui.measureCheckbox.checked = Boolean(_config.ui.defaultMeasureDistance);

      _expansionModel.setMode(_ui.modeSelect.value);
      applyRange();
      applyRenderStyle();
      applyDistribution();
      applyDensity();
      applyTimelineFromSlider();
    }

    // Initial grid density drives point count on load. For example 10 means 10 by 10 for 2D and 10 by 10 by 10 for 3D.
    const _initialDensity = Number(_ui.densityInput.value);
    _renderer2d.setGridCount(_initialDensity);
    _renderer3d.setGridCount(_initialDensity);

    // Shared mutable state for play/pause and selections. For example selectedBIndex defaults to last point.
    const _state = new window.SpaceExpansionAppState.AppState(_initialDensity, _config.measurement);

    // Builds status UI segments once so updates are stable. For example label a(t) shows the scale factor value.
    function buildStatusSegments()
    {
      const _segments = {};
      _ui.statusText.textContent = '';

      function createSegment(_labelText)
      {
        const _segment = document.createElement('span');
        _segment.className = 'statusSegment';

        const _label = document.createElement('span');
        _label.className = 'statusLabel';
        _label.textContent = _labelText;

        const _value = document.createElement('span');
        _value.className = 'statusValue';

        _segment.appendChild(_label);
        _segment.appendChild(_value);
        _ui.statusText.appendChild(_segment);

        return { segment: _segment, value: _value };
      }

      _segments.scale = createSegment('a(t)');
      _segments.relative = createSegment('relative');
      _segments.time = createSegment('t');
      _segments.speed = createSegment('speed');
      _segments.comoving = createSegment('d comoving');
      _segments.proper = createSegment('d proper');

      _segments.comoving.segment.style.display = 'none';
      _segments.proper.segment.style.display = 'none';

      return _segments;
    }

    const _statusSegments = buildStatusSegments();

    // Computes measurement text for overlays and status. For example labelPrecision 1 gives one decimal place.
    function computeMeasurementText(_scaleFactor)
    {
      if (!_ui.measureCheckbox.checked)
      {
        return null;
      }

      const _pointA = _renderer2d.getComovingPointByIndex(_state.selectedAIndex);
      const _pointB = _renderer2d.getComovingPointByIndex(_state.selectedBIndex);

      if (!_pointA || !_pointB)
      {
        return null;
      }

      const _dx = _pointA.x - _pointB.x;
      const _dz = _pointA.z - _pointB.z;
      const _comovingDistanceBoxUnits = Math.sqrt((_dx * _dx) + (_dz * _dz));

      const _boxSizeMpc = Math.max(_config.ui.boxSizeMpc.min, Number(_ui.boxSizeInput.value) || _config.ui.boxSizeMpc.defaultValue);
      const _comovingDistanceMpc = _comovingDistanceBoxUnits * _boxSizeMpc;
      const _properDistanceMpc = _comovingDistanceMpc * _scaleFactor;

      const _labelPrecision = _config.measurement.labelPrecision;

      return {
        comovingDistanceMpc: _comovingDistanceMpc,
        properDistanceMpc: _properDistanceMpc,
        statusSuffix:
          ' , d comoving is ' + _comovingDistanceMpc.toFixed(_labelPrecision) + ' Mpc' +
          ' , d proper is ' + _properDistanceMpc.toFixed(_labelPrecision) + ' Mpc',
        overlayText:
          'A to B\n' +
          'd comoving is ' + _comovingDistanceMpc.toFixed(_labelPrecision) + ' Mpc\n' +
          'd proper is ' + _properDistanceMpc.toFixed(_labelPrecision) + ' Mpc',
        label2d:
          'd proper ' + _properDistanceMpc.toFixed(_labelPrecision) + ' Mpc'
      };
    }

    // Synchronizes timeline slider with the model. For example timelineNormalized 0.5 sets slider to 500.
    function syncTimelineInputToModel()
    {
      const _timelineNormalized = _expansionModel.getTimelineNormalized();
      // Avoid divide-by-zero if max is misconfigured. For example max 0 falls back to 1.
      const _timelineMax = Math.max(1, _config.ui.timelineSlider.max);
      _ui.timelineInput.value = String(Math.round(_timelineNormalized * _timelineMax));
    }

    // Updates the status line with the current simulation values. For example shows a of t, time, speed.
    function updateStatus()
    {
      const _scaleFactor = _expansionModel.getScaleFactor();
      const _scaleRelative = _expansionModel.getScaleRelativeToStart();
      const _timeGyr = _expansionModel.getTimeGyr();
      const _timelineMaxGyr = _expansionModel.getTimelineMaxGyr();

      const _speedGyrPerSecond = mapSpeedSliderToGyrPerSecond(Number(_ui.speedInput.value), _config.ui.speedSlider, _config.numericSafety);

      const _measurement = computeMeasurementText(_scaleFactor);
      const _precision = _config.measurement.statusPrecision;

      _statusSegments.scale.value.textContent = _scaleFactor.toFixed(_precision);
      _statusSegments.relative.value.textContent = _scaleRelative.toFixed(_precision) + '×';
      _statusSegments.time.value.textContent = _timeGyr.toFixed(_precision) + ' / ' + _timelineMaxGyr.toFixed(_precision) + ' Gyr';
      _statusSegments.speed.value.textContent = _speedGyrPerSecond.toFixed(_precision) + ' Gyr/s';

      if (_measurement)
      {
        _statusSegments.comoving.value.textContent = _measurement.comovingDistanceMpc.toFixed(_precision) + ' Mpc';
        _statusSegments.proper.value.textContent = _measurement.properDistanceMpc.toFixed(_precision) + ' Mpc';
        _statusSegments.comoving.segment.style.display = '';
        _statusSegments.proper.segment.style.display = '';
      }
      else
      {
        _statusSegments.comoving.segment.style.display = 'none';
        _statusSegments.proper.segment.style.display = 'none';
      }
    }

    // Advances the simulation and renders a frame. For example requestAnimationFrame keeps it smooth.
    function tick(_timestampMs)
    {
      try
      {
        const _deltaSecondsReal = Math.max(0.0, (_timestampMs - _state.previousTimestampMs) / 1000.0);
        _state.previousTimestampMs = _timestampMs;

        const _speedGyrPerSecond = mapSpeedSliderToGyrPerSecond(Number(_ui.speedInput.value), _config.ui.speedSlider, _config.numericSafety);
        const _deltaSecondsCosmic = _deltaSecondsReal * _speedGyrPerSecond * _config.units.secondsPerGyr;

        if (!_state.isPaused)
        {
          _expansionModel.stepSeconds(_deltaSecondsCosmic);
        }

        const _scaleFactor = _expansionModel.getScaleFactor();
        const _scaleRelative = _expansionModel.getScaleRelativeToStart();

        const _pointA = _renderer2d.getComovingPointByIndex(_state.selectedAIndex);
        const _pointB = _renderer2d.getComovingPointByIndex(_state.selectedBIndex);

        const _ySliceComoving = getComovingSliceYForDensity(_renderer2d.grid.gridCount);

        const _selectionAComoving = _pointA ? [_pointA.x, _ySliceComoving, _pointA.z] : null;
        const _selectionBComoving = _pointB ? [_pointB.x, _ySliceComoving, _pointB.z] : null;

        const _renderOptions =
        {
          showBoundPoints: _ui.boundCheckbox.checked,
          showMeasurement: _ui.measureCheckbox.checked,
          selectedAIndex: _state.selectedAIndex,
          selectedBIndex: _state.selectedBIndex,
          selectedAComoving: _selectionAComoving,
          selectedBComoving: _selectionBComoving
        };

        const _measurement = computeMeasurementText(_scaleFactor);

        if (_measurement)
        {
          _renderOptions.measurementLabel = _measurement.label2d;
          _ui.overlay2d.textContent = _measurement.overlayText;
          _ui.overlay3d.textContent = _measurement.overlayText;
        }
        else
        {
          _ui.overlay2d.textContent = '';
          _ui.overlay3d.textContent = '';
        }

        _renderer2d.render(_scaleRelative, _renderOptions);
        _renderer3d.render(_scaleRelative, _deltaSecondsReal, _renderOptions);

        if (!_state.isPaused)
        {
          syncTimelineInputToModel();
        }

        updateStatus();
        requestAnimationFrame(tick);
      }
      catch (_error)
      {
        showFatalError(_error);
      }
    }

    // Updates the maximum range shown and resets the model. For example 6 times range shows more expansion.
    function applyRange()
    {
      const _aMax = Number(_ui.rangeSelect.value);
      _expansionModel.setAMax(_aMax);
      _renderer2d.setMaxShownScaleRelative(_aMax);
      _renderer3d.setMaxShownScaleRelative(_aMax);
    }

    // Applies render style to both views. For example markers show squares and cubes.
    function applyRenderStyle()
    {
      _renderer2d.setRenderStyle(_ui.renderSelect.value);
      _renderer3d.setRenderStyle(_ui.renderSelect.value);
    }

    // Applies distribution mode to both views. For example random scatters points.
    function applyDistribution()
    {
      _renderer2d.setDistributionMode(_ui.distributionSelect.value);
      _renderer3d.setDistributionMode(_ui.distributionSelect.value);
    }

    // Applies density and clamps selected indices. For example lower density reduces point count.
    function applyDensity()
    {
      const _density = Number(_ui.densityInput.value);
      _renderer2d.setGridCount(_density);
      _renderer3d.setGridCount(_density);

      const _pointCount = _density * _density;
      _state.selectedAIndex = Math.max(0, Math.min(_state.selectedAIndex, _pointCount - 1));
      _state.selectedBIndex = Math.max(0, Math.min(_state.selectedBIndex, _pointCount - 1));
    }

    _ui.modeSelect.addEventListener('change', function ()
    {
      _expansionModel.setMode(_ui.modeSelect.value);
      syncTimelineInputToModel();
      _state.isPaused = true;
      _ui.playPauseButton.textContent = 'Play';
    });

    _ui.renderSelect.addEventListener('change', function ()
    {
      applyRenderStyle();
    });

    _ui.distributionSelect.addEventListener('change', function ()
    {
      applyDistribution();
    });

    _ui.rangeSelect.addEventListener('change', function ()
    {
      applyRange();
      _expansionModel.reset();
      applyTimelineFromSlider();
      syncTimelineInputToModel();
    });

    _ui.densityInput.addEventListener('input', function ()
    {
      applyDensity();
    });

    _ui.playPauseButton.addEventListener('click', function ()
    {
      _state.isPaused = !_state.isPaused;
      _ui.playPauseButton.textContent = _state.isPaused ? 'Play' : 'Pause';
    });

    _ui.controlsToggleButton.addEventListener('click', function ()
    {
      _hasUserToggledControls = true;
      applyControlsCollapsed(!_controlsCollapsed);
      applyResponsivePaneSizing();
    });

    _ui.resetButton.addEventListener('click', function ()
    {
      applyUiDefaults();
      syncTimelineInputToModel();
    });

    _ui.timelineInput.addEventListener('input', function ()
    {
      // Avoid divide-by-zero if max is misconfigured. For example max 0 falls back to 1.
      const _timelineMax = Math.max(1, _config.ui.timelineSlider.max);
      const _normalized = Number(_ui.timelineInput.value) / _timelineMax;
      _expansionModel.setTimelineNormalized(_normalized);

      _state.isPaused = true;
      _ui.playPauseButton.textContent = 'Play';
    });

    _ui.canvas2d.addEventListener('click', function (_event)
    {
      const _scaleRelative = _expansionModel.getScaleRelativeToStart();
      const _pickedIndex = _renderer2d.pickPointFromClientCoordinates(_event.clientX, _event.clientY, _scaleRelative);

      if (_pickedIndex === null)
      {
        return;
      }

      if (_event.shiftKey)
      {
        _state.selectedBIndex = _pickedIndex;
      }
      else
      {
        _state.selectedAIndex = _pickedIndex;
      }
    });

    window.addEventListener('resize', function ()
    {
      const _isCompactNow = isCompactLayout();

      if (!_isCompactNow)
      {
        _hasUserToggledControls = false;
        applyControlsCollapsed(false);
      }
      else if (!_hasUserToggledControls)
      {
        applyControlsCollapsed(true);
      }

      // Canvases resize automatically per frame and this just reduces latency.
      applyResponsivePaneSizing();
      _renderer2d.render(_expansionModel.getScaleRelativeToStart());
      _renderer3d.render(_expansionModel.getScaleRelativeToStart(), 0.0);
    });

    updateStatus();
    applyTimelineFromSlider();
    syncTimelineInputToModel();
    requestAnimationFrame(tick);
  }

  // Bootstraps after DOM is ready and config is loaded. For example a local file uses fallback config.
  function main()
  {
    const _statusText = window.SpaceExpansionDom.getElementByIdRequired('statusText');
    _statusText.textContent = 'Loading config...';

    window.SpaceExpansionConfigLoader.loadConfig()
      .then(function (_config)
      {
        startApp(_config);
      })
      .catch(function (_error)
      {
        _statusText.textContent = 'Error ' + (_error && _error.message ? _error.message : 'Config load failed');
        _statusText.style.color = 'rgba(255, 180, 180, 0.95)';
      });
  }

  if (document.readyState === 'loading')
  {
    document.addEventListener('DOMContentLoaded', main);
  }
  else
  {
    main();
  }
})();
