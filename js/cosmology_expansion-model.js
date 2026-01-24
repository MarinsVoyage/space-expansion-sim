(function ()
{
  'use strict';

  // Converts H0 from km per second per Mpc into 1 per second so time calculations stay consistent. For example 70 becomes about 2.27e-18 per second.
  function kmPerSecondPerMegaparsecToPerSecond(_h0KmPerSecondPerMegaparsec)
  {
    const _metersPerMegaparsec = 3.085677581e22;
    const _metersPerSecondPerMegaparsec = _h0KmPerSecondPerMegaparsec * 1000.0;
    return _metersPerSecondPerMegaparsec / _metersPerMegaparsec;
  }

  class ExpansionModel
  {
    // Holds the expansion model state with configurable physics values. For example mode lcdm uses Friedmann lookup.
    constructor(_options)
    {
      const _numbers = window.SpaceExpansionNumbers;
      const _physics = (_options && _options.physics) ? _options.physics : {};
      const _parameters = _physics.parameters || {};
      const _numericSafety = (_options && _options.numericSafety) ? _options.numericSafety : {};
      const _units = (_options && _options.units) ? _options.units : {};

      // Store base parameters so the model can rebuild timelines when mode changes.
      this.h0KmPerSecondPerMegaparsec = _parameters.h0KmPerSecondPerMegaparsec;
      this.omegaMatter = _parameters.omegaMatter;
      this.omegaRadiation = _parameters.omegaRadiation;
      this.omegaLambda = _parameters.omegaLambda;
      this.aMin = _parameters.aMin;
      this.aStart = _parameters.aStart;
      this.aMax = _physics.defaultAMax;
      this.mode = _physics.defaultMode;

      // Numeric safety limits keep divisions stable. For example minScaleFactor prevents a of 0.
      this.numericSafety = _numericSafety;
      // Unit values keep conversions consistent. For example secondsPerGyr 3.15576e16.
      this.units = _units;

      // Store H0 in per second units for time integration. For example H0 67.4 becomes about 2.18e-18 per second.
      this.h0PerSecond = kmPerSecondPerMegaparsecToPerSecond(this.h0KmPerSecondPerMegaparsec);

      // Timeline values cache the precomputed LCDM integration results. For example timelineSecondsMax is the total duration.
      this.timelineSecondsMax = 0.0;
      this.timelineSampleTimesSeconds = null;
      this.timelineSampleScaleFactors = null;

      // Keep a reference to numeric helpers for internal use.
      this.numbers = _numbers;
      this.physics = _physics;

      this.rebuildTimeline();
      this.reset();
    }

    // Resets the model to aStart so the visualization returns to today. For example aStart 1 means present day.
    reset()
    {
      const _numbers = this.numbers;
      const _aReset = _numbers.clampNumber(this.aStart, this.aMin, this.aMax);
      this.timeSeconds = this.computeTimeSecondsFromScaleFactor(_aReset);
      this.a = _aReset;
    }

    // Switches between LCDM, de Sitter, and linear modes. For example setMode with linear uses simple scaling.
    setMode(_mode)
    {
      this.mode = _mode;
      this.rebuildTimeline();
      this.reset();
    }

    // Updates the maximum scale factor shown and clamps the current state. For example aMax 6 allows 6 times expansion.
    setAMax(_aMax)
    {
      this.aMax = Math.max(this.aStart, _aMax);
      this.rebuildTimeline();
      this.a = this.numbers.clampNumber(this.a, this.aMin, this.aMax);
      this.timeSeconds = this.computeTimeSecondsFromScaleFactor(this.a);
    }

    // Computes H at a for a flat universe used for LCDM integration. For example large a increases the Lambda term.
    hubbleAtA(_a)
    {
      const _minScaleFactor = this.numericSafety.minScaleFactor;
      const _aSafe = Math.max(_minScaleFactor, _a);
      const _omegaRadiationTerm = this.omegaRadiation / Math.pow(_aSafe, 4.0);
      const _omegaMatterTerm = this.omegaMatter / Math.pow(_aSafe, 3.0);
      const _omegaLambdaTerm = this.omegaLambda;
      const _sum = _omegaRadiationTerm + _omegaMatterTerm + _omegaLambdaTerm;
      return this.h0PerSecond * Math.sqrt(Math.max(0.0, _sum));
    }

    // Returns the rate of change of a with time for diagnostics or extensions. For example derivativeA with 1 uses H at a 1.
    derivativeA(_a)
    {
      return _a * this.hubbleAtA(_a);
    }

    // Precomputes timeline samples so scrubbing is fast. For example LCDM uses a lookup table for a of t.
    rebuildTimeline()
    {
      this.timelineSampleTimesSeconds = null;
      this.timelineSampleScaleFactors = null;

      const _secondsPerGyr = this.units.secondsPerGyr;
      const _numbers = this.numbers;

      if (this.mode === 'linear')
      {
        this.timelineSecondsMax = this.physics.linearTimelineGyr * _secondsPerGyr;
        return;
      }

      if (this.mode === 'desitter')
      {
        const _h = this.h0PerSecond * Math.sqrt(Math.max(0.0, this.omegaLambda));

        if (_h <= 0.0)
        {
          this.timelineSecondsMax = 0.0;
          return;
        }

        const _aMin = Math.max(this.numericSafety.minScaleFactor, this.aMin);
        this.timelineSecondsMax = Math.log(this.aMax / _aMin) / _h;
        return;
      }

      // Flat LambdaCDM builds a monotonic lookup table for a of t by integrating time over scale factor.
      const _stepCount = Math.max(16, Math.floor(this.physics.timelineSampleCount));
      const _aMin = Math.max(this.numericSafety.minScaleFactor, Math.min(this.aMin, this.aStart, this.aMax));
      const _aMax = this.aMax;

      const _sampleTimesSeconds = new Float32Array(_stepCount + 1);
      const _sampleScaleFactors = new Float32Array(_stepCount + 1);

      _sampleTimesSeconds[0] = 0.0;
      _sampleScaleFactors[0] = _aMin;

      let _accumulatedSeconds = 0.0;

      for (let _stepIndex = 0; _stepIndex < _stepCount; _stepIndex++)
      {
        const _t0 = _stepIndex / _stepCount;
        const _t1 = (_stepIndex + 1) / _stepCount;

        const _a0 = _numbers.lerpNumber(_aMin, _aMax, _t0);
        const _a1 = _numbers.lerpNumber(_aMin, _aMax, _t1);
        const _aMid = 0.5 * (_a0 + _a1);
        const _da = _a1 - _a0;

        const _hMid = this.hubbleAtA(_aMid);
        const _denominator = Math.max(this.numericSafety.minDenominator, _aMid * _hMid);
        const _dt = _da / _denominator;

        _accumulatedSeconds += _dt;
        _sampleTimesSeconds[_stepIndex + 1] = _accumulatedSeconds;
        _sampleScaleFactors[_stepIndex + 1] = _a1;
      }

      this.timelineSecondsMax = _accumulatedSeconds;
      this.timelineSampleTimesSeconds = _sampleTimesSeconds;
      this.timelineSampleScaleFactors = _sampleScaleFactors;
    }

    // Converts elapsed time to scale factor using the precomputed timeline. For example t of 0 returns aMin.
    computeScaleFactorFromTimeSeconds(_timeSeconds)
    {
      const _numbers = this.numbers;
      const _timeSecondsClamped = _numbers.clampNumber(_timeSeconds, 0.0, Math.max(0.0, this.timelineSecondsMax));

      if (this.mode === 'linear')
      {
        const _durationSeconds = Math.max(this.numericSafety.minMaxTime, this.timelineSecondsMax);
        const _tNormalized = _timeSecondsClamped / _durationSeconds;
        return _numbers.lerpNumber(this.aMin, this.aMax, _tNormalized);
      }

      if (this.mode === 'desitter')
      {
        const _h = this.h0PerSecond * Math.sqrt(Math.max(0.0, this.omegaLambda));
        const _aMin = Math.max(this.numericSafety.minScaleFactor, this.aMin);
        const _aValue = _aMin * Math.exp(_h * _timeSecondsClamped);
        return _numbers.clampNumber(_aValue, _aMin, this.aMax);
      }

      const _times = this.timelineSampleTimesSeconds;
      const _scaleFactors = this.timelineSampleScaleFactors;

      if (!_times || !_scaleFactors || _times.length < 2)
      {
        return this.aStart;
      }

      const _maxTime = _times[_times.length - 1];

      if (_maxTime <= 0.0)
      {
        return this.aStart;
      }

      const _target = _numbers.clampNumber(_timeSecondsClamped, 0.0, _maxTime);

      // Binary search in monotonic increasing time array.
      let _lowIndex = 0;
      let _highIndex = _times.length - 1;

      while (_highIndex - _lowIndex > 1)
      {
        const _midIndex = (_lowIndex + _highIndex) >> 1;

        if (_times[_midIndex] <= _target)
        {
          _lowIndex = _midIndex;
        }
        else
        {
          _highIndex = _midIndex;
        }
      }

      const _t0 = _times[_lowIndex];
      const _t1 = _times[_highIndex];
      const _a0 = _scaleFactors[_lowIndex];
      const _a1 = _scaleFactors[_highIndex];

      const _segmentDuration = Math.max(this.numericSafety.minSegmentDuration, _t1 - _t0);
      const _segmentT = (_target - _t0) / _segmentDuration;

      return _numbers.lerpNumber(_a0, _a1, _segmentT);
    }

    // Converts scale factor to elapsed time for scrubbing. For example a 1 returns time near today.
    computeTimeSecondsFromScaleFactor(_a)
    {
      const _numbers = this.numbers;
      const _aClamped = _numbers.clampNumber(_a, this.aMin, this.aMax);

      if (this.mode === 'linear')
      {
        const _aRange = Math.max(this.numericSafety.minSegmentDuration, this.aMax - this.aMin);
        const _tNormalized = (_aClamped - this.aMin) / _aRange;
        return _numbers.clampNumber(_tNormalized, 0.0, 1.0) * Math.max(0.0, this.timelineSecondsMax);
      }

      if (this.mode === 'desitter')
      {
        const _h = this.h0PerSecond * Math.sqrt(Math.max(0.0, this.omegaLambda));
        const _aMin = Math.max(this.numericSafety.minScaleFactor, this.aMin);

        if (_h <= 0.0)
        {
          return 0.0;
        }

        const _ratio = Math.max(this.numericSafety.minRatio, _aClamped / _aMin);
        return _numbers.clampNumber(Math.log(_ratio) / _h, 0.0, Math.max(0.0, this.timelineSecondsMax));
      }

      const _times = this.timelineSampleTimesSeconds;
      const _scaleFactors = this.timelineSampleScaleFactors;

      if (!_times || !_scaleFactors || _times.length < 2)
      {
        return 0.0;
      }

      const _target = _numbers.clampNumber(_aClamped, _scaleFactors[0], _scaleFactors[_scaleFactors.length - 1]);

      // Binary search in monotonic increasing a array.
      let _lowIndex = 0;
      let _highIndex = _scaleFactors.length - 1;

      while (_highIndex - _lowIndex > 1)
      {
        const _midIndex = (_lowIndex + _highIndex) >> 1;

        if (_scaleFactors[_midIndex] <= _target)
        {
          _lowIndex = _midIndex;
        }
        else
        {
          _highIndex = _midIndex;
        }
      }

      const _a0 = _scaleFactors[_lowIndex];
      const _a1 = _scaleFactors[_highIndex];
      const _t0 = _times[_lowIndex];
      const _t1 = _times[_highIndex];

      const _segmentRange = Math.max(this.numericSafety.minSegmentRange, _a1 - _a0);
      const _segmentT = (_target - _a0) / _segmentRange;

      return _numbers.lerpNumber(_t0, _t1, _segmentT);
    }

    // Advances the model by real seconds converted into simulated seconds. For example delta 0.1 updates a of t smoothly.
    stepSeconds(_deltaSeconds)
    {
      const _deltaSecondsSafe = Number.isFinite(_deltaSeconds) ? _deltaSeconds : 0.0;

      this.timeSeconds = this.numbers.clampNumber(this.timeSeconds + _deltaSecondsSafe, 0.0, Math.max(0.0, this.timelineSecondsMax));
      this.a = this.computeScaleFactorFromTimeSeconds(this.timeSeconds);
    }

    // Sets the timeline position from 0 to 1 for the scrubber. For example 0.5 goes to the midpoint of the timeline.
    setTimelineNormalized(_timelineNormalized)
    {
      const _tNormalized = this.numbers.clampNumber(_timelineNormalized, 0.0, 1.0);
      this.timeSeconds = _tNormalized * Math.max(0.0, this.timelineSecondsMax);
      this.a = this.computeScaleFactorFromTimeSeconds(this.timeSeconds);
    }

    // Returns the normalized timeline position from 0 to 1 for UI sync. For example 0 means start of timeline.
    getTimelineNormalized()
    {
      const _max = Math.max(this.numericSafety.minMaxTime, this.timelineSecondsMax);
      return this.numbers.clampNumber(this.timeSeconds / _max, 0.0, 1.0);
    }

    // Returns the maximum timeline value in Gyr for display. For example 12 Gyr in linear mode.
    getTimelineMaxGyr()
    {
      return this.timelineSecondsMax / this.units.secondsPerGyr;
    }

    // Returns the current simulation time in Gyr. For example 1.2 means 1.2 Gyr from t of 0.
    getTimeGyr()
    {
      return this.timeSeconds / this.units.secondsPerGyr;
    }

    // Returns the current scale factor a of t. For example 1.0 means aStart.
    getScaleFactor()
    {
      return this.a;
    }

    // Returns a relative scale factor a divided by aStart for rendering. For example 2 means twice today.
    getScaleRelativeToStart()
    {
      return this.a / this.aStart;
    }
  }

  window.SpaceExpansionCosmology =
  {
    ExpansionModel: ExpansionModel
  };
})();
