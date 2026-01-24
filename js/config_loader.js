(function ()
{
  'use strict';

  // Path to the JSON config file when served over a server. For example the config file in the config folder.
  const _CONFIG_PATH = 'config/space-expansion.json';

  // Default configuration used when JSON loading fails, so the app still runs from a local file. For example opening index.html directly.
  const _fallbackConfig =
  {
    meta:
    {
      configVersion: 1,
      defaultLanguage: 'en'
    },
    physics:
    {
      defaultMode: 'lcdm',
      modes:
      [
        { value: 'lcdm', label: 'Flat LambdaCDM Friedmann model' },
        { value: 'desitter', label: 'Pure Lambda de Sitter model' },
        { value: 'linear', label: 'Linear a of t toy model' }
      ],
      parameters:
      {
        h0KmPerSecondPerMegaparsec: 67.4,
        omegaMatter: 0.315,
        omegaRadiation: 0.0,
        omegaLambda: 0.685,
        aMin: 0.01,
        aStart: 1.0
      },
      linearTimelineGyr: 12.0,
      timelineSampleCount: 2600,
      aMaxOptions:
      [
        { value: 2, label: '1 to 2 times' },
        { value: 3, label: '1 to 3 times' },
        { value: 4, label: '1 to 4 times' },
        { value: 6, label: '1 to 6 times' }
      ],
      defaultAMax: 3
    },
    ui:
    {
      defaultRenderStyle: 'dots',
      defaultDistributionMode: 'grid',
      defaultShowBoundPoints: false,
      defaultMeasureDistance: true,
      renderStyles:
      [
        { value: 'dots', label: 'Dots' },
        { value: 'markers', label: 'Markers squares and cubes' },
        { value: 'voxels', label: 'Voxels connected grid' }
      ],
      distributionModes:
      [
        { value: 'grid', label: 'Grid' },
        { value: 'random', label: 'Random' }
      ],
      speedSlider:
      {
        min: 0,
        max: 100,
        defaultValue: 55,
        minGyrPerSecond: 0.01,
        maxGyrPerSecond: 5.0
      },
      timelineSlider:
      {
        min: 0,
        max: 1000,
        defaultValue: 0
      },
      densitySlider:
      {
        min: 4,
        max: 18,
        defaultValue: 10
      },
      boxSizeMpc:
      {
        min: 1,
        step: 1,
        defaultValue: 1000
      }
    },
    rendering:
    {
      renderer2d:
      {
        gridCountMin: 2,
        gridCountMax: 40,
        view:
        {
          maxScalePadding: 0.44,
          boundaryLineScale: 600,
          gridLineScale: 950,
          measurementLineScale: 900,
          measurementFontScale: 70,
          measurementLabelMinHeight: 18,
          measurementLabelHeightScale: 0.04,
          labelPadding: 6,
          boundPointRadiusMin: 1.1,
          boundPointRadiusScale: 620,
          pointRadiusMin: 1.2,
          pointRadiusScale: 520,
          cornerRadiusScale: 0.55,
          cornerRadiusMin: 0.8,
          highlightLineScale: 850,
          selectionHighlightScale: 1.9,
          voxelHalfSizeScale: 0.55,
          voxelHalfSizeMin: 0.9,
          voxelHalfSizeBoundScale: 0.85,
          pickThresholdPixels: 10.0,
          pickThresholdMinDimScale: 0.02
        }
      },
      renderer3d:
      {
        gridCountMin: 2,
        gridCountMax: 32,
        initialRotationYRadians: 0.0,
        initialRotationXRadians: -0.45,
        rotationSpeedRadiansPerSecond: 0.18,
        cameraDistanceScale: 2.2,
        fovDegrees: 55.0,
        near: 0.05,
        far: 200.0,
        pointSizeScale: 360.0,
        pointSizeMin: 2.0,
        boundPointSizeScale: 0.92
      },
      boundPoints:
      {
        extent: 0.12,
        count: 4
      },
      gridSpacingScale: 0.55,
      colors2d:
      {
        boundaryStroke: [231, 238, 252, 0.35],
        measurementLine: [255, 255, 255, 0.45],
        measurementLabelFill: [10, 13, 19, 0.7],
        measurementLabelStroke: [255, 255, 255, 0.12],
        measurementLabelText: [231, 238, 252, 0.92],
        gridLine: [107, 178, 255, 0.18],
        boundPoint: [231, 238, 252, 0.6],
        gridPoint: [107, 178, 255, 0.95],
        gridPointVoxel: [107, 178, 255, 0.32],
        highlightStroke: [255, 255, 255, 0.75],
        crosshair: [255, 255, 255, 0.1]
      },
      colors3d:
      {
        cubeLine: [0.9, 0.94, 0.99, 0.3],
        gridLine: [0.42, 0.7, 1.0, 0.16],
        markerLine: [0.42, 0.7, 1.0, 0.22],
        point: [0.42, 0.7, 1.0, 0.88],
        boundPoint: [0.9, 0.94, 0.99, 0.6],
        selectionPoint: [1.0, 1.0, 1.0, 0.9],
        measurementLine: [1.0, 1.0, 1.0, 0.55]
      }
    },
    measurement:
    {
      labelPrecision: 1,
      statusPrecision: 3,
      defaultSelectedAIndex: 0,
      defaultSelectedBIndexMode: 'last'
    },
    units:
    {
      secondsPerGyr: 3.15576e16
    },
    numericSafety:
    {
      minScaleFactor: 1e-9,
      minDenominator: 1e-24,
      minSegmentDuration: 1e-9,
      minSegmentRange: 1e-12,
      minRatio: 1e-12,
      minMaxTime: 1e-9,
      minPositiveSpeedGyrPerSecond: 1e-4
    }
  };

  // Checks if a value is a plain object so we can deep merge configs safely. For example isPlainObject with an empty object returns true.
  function isPlainObject(_value)
  {
    return Boolean(_value) && typeof _value === 'object' && !Array.isArray(_value);
  }

  // Deep merges overrides into the base config so partial JSON edits still work. For example override only physics parameters.
  function mergeConfig(_baseConfig, _overrideConfig)
  {
    const _result = Array.isArray(_baseConfig) ? [] : {};
    const _baseKeys = Object.keys(_baseConfig || {});

    for (let _i = 0; _i < _baseKeys.length; _i++)
    {
      const _key = _baseKeys[_i];
      const _baseValue = _baseConfig[_key];
      const _overrideValue = _overrideConfig ? _overrideConfig[_key] : undefined;

      if (isPlainObject(_baseValue))
      {
        _result[_key] = mergeConfig(_baseValue, isPlainObject(_overrideValue) ? _overrideValue : {});
      }
      else if (Array.isArray(_baseValue))
      {
        _result[_key] = Array.isArray(_overrideValue) ? _overrideValue.slice() : _baseValue.slice();
      }
      else
      {
        _result[_key] = (_overrideValue !== undefined) ? _overrideValue : _baseValue;
      }
    }

    // Preserve extra override keys so custom extensions are not lost. For example adding a new UI section in JSON.
    if (isPlainObject(_overrideConfig))
    {
      const _overrideKeys = Object.keys(_overrideConfig);

      for (let _i = 0; _i < _overrideKeys.length; _i++)
      {
        const _key = _overrideKeys[_i];

        if (_result[_key] === undefined)
        {
          _result[_key] = _overrideConfig[_key];
        }
      }
    }

    return _result;
  }

  // Returns a finite number or the fallback to keep config values correct. For example NaN falls back to 10.
  function getFiniteNumberOrFallback(_value, _fallbackValue)
  {
    return Number.isFinite(_value) ? _value : _fallbackValue;
  }

  // Clamps a number between min and max when provided. For example clampToRange 5, 0, 3 returns 3.
  function clampToRange(_value, _minValue, _maxValue)
  {
    let _result = _value;

    if (Number.isFinite(_minValue))
    {
      _result = Math.max(_minValue, _result);
    }

    if (Number.isFinite(_maxValue))
    {
      _result = Math.min(_maxValue, _result);
    }

    return _result;
  }

  // Ensures config values are safe for production edits. For example speed min clamps to a positive value.
  function sanitizeConfig(_config, _fallbackConfig)
  {
    const _result = mergeConfig(_fallbackConfig, isPlainObject(_config) ? _config : {});

    const _fallbackUi = _fallbackConfig.ui || {};
    const _fallbackRendering = _fallbackConfig.rendering || {};
    const _fallbackPhysics = _fallbackConfig.physics || {};
    const _fallbackMeasurement = _fallbackConfig.measurement || {};
    const _fallbackNumericSafety = _fallbackConfig.numericSafety || {};

    const _ui = _result.ui || {};
    const _rendering = _result.rendering || {};
    const _physics = _result.physics || {};
    const _measurement = _result.measurement || {};
    const _numericSafety = _result.numericSafety || {};

    _result.ui = _ui;
    _result.rendering = _rendering;
    _result.physics = _physics;
    _result.measurement = _measurement;
    _result.numericSafety = _numericSafety;

    const _speedFallback = _fallbackUi.speedSlider || {};
    const _speed = _ui.speedSlider || {};
    _ui.speedSlider = _speed;

    const _speedMin = getFiniteNumberOrFallback(_speed.min, _speedFallback.min);
    const _speedMax = Math.max(_speedMin, getFiniteNumberOrFallback(_speed.max, _speedFallback.max));
    _speed.min = _speedMin;
    _speed.max = _speedMax;
    _speed.defaultValue = clampToRange(getFiniteNumberOrFallback(_speed.defaultValue, _speedFallback.defaultValue), _speedMin, _speedMax);

    const _minPositiveSpeedFallback = getFiniteNumberOrFallback(
      _fallbackNumericSafety.minPositiveSpeedGyrPerSecond,
      _speedFallback.minGyrPerSecond
    );

    const _minPositiveSpeedCandidate = getFiniteNumberOrFallback(
      _numericSafety.minPositiveSpeedGyrPerSecond,
      _minPositiveSpeedFallback
    );

    const _minPositiveSpeed = (_minPositiveSpeedCandidate > 0) ? _minPositiveSpeedCandidate : _minPositiveSpeedFallback;
    _numericSafety.minPositiveSpeedGyrPerSecond = _minPositiveSpeed;

    const _minGyr = Math.max(_minPositiveSpeed, getFiniteNumberOrFallback(_speed.minGyrPerSecond, _speedFallback.minGyrPerSecond));
    const _maxGyr = Math.max(_minGyr, getFiniteNumberOrFallback(_speed.maxGyrPerSecond, _speedFallback.maxGyrPerSecond));
    _speed.minGyrPerSecond = _minGyr;
    _speed.maxGyrPerSecond = _maxGyr;

    const _timelineFallback = _fallbackUi.timelineSlider || {};
    const _timeline = _ui.timelineSlider || {};
    _ui.timelineSlider = _timeline;
    _timeline.min = getFiniteNumberOrFallback(_timeline.min, _timelineFallback.min);
    _timeline.max = Math.max(_timeline.min, getFiniteNumberOrFallback(_timeline.max, _timelineFallback.max));
    _timeline.defaultValue = clampToRange(getFiniteNumberOrFallback(_timeline.defaultValue, _timelineFallback.defaultValue), _timeline.min, _timeline.max);

    const _densityFallback = _fallbackUi.densitySlider || {};
    const _density = _ui.densitySlider || {};
    _ui.densitySlider = _density;
    _density.min = Math.max(1, Math.floor(getFiniteNumberOrFallback(_density.min, _densityFallback.min)));
    _density.max = Math.max(_density.min, Math.floor(getFiniteNumberOrFallback(_density.max, _densityFallback.max)));
    _density.defaultValue = clampToRange(Math.floor(getFiniteNumberOrFallback(_density.defaultValue, _densityFallback.defaultValue)), _density.min, _density.max);

    const _boxFallback = _fallbackUi.boxSizeMpc || {};
    const _box = _ui.boxSizeMpc || {};
    _ui.boxSizeMpc = _box;
    _box.min = Math.max(0, getFiniteNumberOrFallback(_box.min, _boxFallback.min));
    const _boxStepCandidate = getFiniteNumberOrFallback(_box.step, _boxFallback.step);
    _box.step = (_boxStepCandidate > 0) ? _boxStepCandidate : _boxFallback.step;
    _box.defaultValue = Math.max(_box.min, getFiniteNumberOrFallback(_box.defaultValue, _boxFallback.defaultValue));

    const _renderer2dFallback = _fallbackRendering.renderer2d || {};
    const _renderer2d = _rendering.renderer2d || {};
    _rendering.renderer2d = _renderer2d;
    _renderer2d.gridCountMin = Math.max(1, Math.floor(getFiniteNumberOrFallback(_renderer2d.gridCountMin, _renderer2dFallback.gridCountMin)));
    _renderer2d.gridCountMax = Math.max(_renderer2d.gridCountMin, Math.floor(getFiniteNumberOrFallback(_renderer2d.gridCountMax, _renderer2dFallback.gridCountMax)));

    const _renderer3dFallback = _fallbackRendering.renderer3d || {};
    const _renderer3d = _rendering.renderer3d || {};
    _rendering.renderer3d = _renderer3d;
    _renderer3d.gridCountMin = Math.max(1, Math.floor(getFiniteNumberOrFallback(_renderer3d.gridCountMin, _renderer3dFallback.gridCountMin)));
    _renderer3d.gridCountMax = Math.max(_renderer3d.gridCountMin, Math.floor(getFiniteNumberOrFallback(_renderer3d.gridCountMax, _renderer3dFallback.gridCountMax)));

    const _boundFallback = _fallbackRendering.boundPoints || {};
    const _bound = _rendering.boundPoints || {};
    _rendering.boundPoints = _bound;
    _bound.extent = Math.max(0, getFiniteNumberOrFallback(_bound.extent, _boundFallback.extent));
    _bound.count = Math.max(1, Math.floor(getFiniteNumberOrFallback(_bound.count, _boundFallback.count)));

    _physics.timelineSampleCount = Math.max(16, Math.floor(getFiniteNumberOrFallback(_physics.timelineSampleCount, _fallbackPhysics.timelineSampleCount)));
    _physics.linearTimelineGyr = Math.max(0, getFiniteNumberOrFallback(_physics.linearTimelineGyr, _fallbackPhysics.linearTimelineGyr));

    const _parametersFallback = _fallbackPhysics.parameters || {};
    const _parameters = _physics.parameters || {};
    _physics.parameters = _parameters;
    _parameters.h0KmPerSecondPerMegaparsec = getFiniteNumberOrFallback(_parameters.h0KmPerSecondPerMegaparsec, _parametersFallback.h0KmPerSecondPerMegaparsec);
    _parameters.omegaMatter = getFiniteNumberOrFallback(_parameters.omegaMatter, _parametersFallback.omegaMatter);
    _parameters.omegaRadiation = getFiniteNumberOrFallback(_parameters.omegaRadiation, _parametersFallback.omegaRadiation);
    _parameters.omegaLambda = getFiniteNumberOrFallback(_parameters.omegaLambda, _parametersFallback.omegaLambda);

    const _minScale = Math.max(0, getFiniteNumberOrFallback(_numericSafety.minScaleFactor, _fallbackNumericSafety.minScaleFactor));
    _numericSafety.minScaleFactor = _minScale;
    _parameters.aMin = Math.max(_minScale, getFiniteNumberOrFallback(_parameters.aMin, _parametersFallback.aMin));
    _parameters.aStart = Math.max(_parameters.aMin, getFiniteNumberOrFallback(_parameters.aStart, _parametersFallback.aStart));

    _measurement.labelPrecision = Math.max(0, Math.floor(getFiniteNumberOrFallback(_measurement.labelPrecision, _fallbackMeasurement.labelPrecision)));
    _measurement.statusPrecision = Math.max(0, Math.floor(getFiniteNumberOrFallback(_measurement.statusPrecision, _fallbackMeasurement.statusPrecision)));

    return _result;
  }

  // Loads JSON config with a safe fallback so the app can run without a server. For example a local file uses fallback.
  function loadConfig()
  {
    // Fall back when fetch is unavailable so older browsers can still run. For example in locked down environments.
    if (typeof fetch !== 'function')
    {
      return Promise.resolve(sanitizeConfig({}, _fallbackConfig));
    }

    return fetch(_CONFIG_PATH, { cache: 'no-store' })
      .then(function (_response)
      {
        if (!_response.ok)
        {
          throw new Error('Config load failed ' + _response.status);
        }

        return _response.json();
      })
      .then(function (_config)
      {
        return sanitizeConfig(_config, _fallbackConfig);
      })
      .catch(function ()
      {
        return sanitizeConfig({}, _fallbackConfig);
      });
  }

  window.SpaceExpansionConfigLoader =
  {
    loadConfig: loadConfig
  };
})();
