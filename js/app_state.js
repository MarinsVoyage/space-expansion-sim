(function ()
{
  'use strict';

  class AppState
  {
    // Stores mutable app state for the simulation loop. For example isPaused true stops time updates.
    constructor(_initialDensity, _measurementConfig)
    {
      const _measurement = _measurementConfig || {};
      // Point count drives correct index range. For example density 10 means 100 points in 2D.
      const _pointCount = Math.max(1, _initialDensity * _initialDensity);

      // Tracks whether the simulation advances and true means time is frozen.
      this.isPaused = false;
      // Stores the last animation frame timestamp for delta time. For example 16ms between frames.
      this.previousTimestampMs = performance.now();

      // Stores selected point indices for measurement. For example defaultSelectedBIndexMode last picks the final point.
      const _defaultSelectedAIndex = Number.isFinite(_measurement.defaultSelectedAIndex) ? Math.floor(_measurement.defaultSelectedAIndex) : 0;
      const _defaultSelectedBMode = _measurement.defaultSelectedBIndexMode || 'last';

      let _defaultSelectedBIndex = _pointCount - 1;

      if (_defaultSelectedBMode === 'first')
      {
        _defaultSelectedBIndex = 0;
      }
      else if (_defaultSelectedBMode === 'same-as-a')
      {
        _defaultSelectedBIndex = _defaultSelectedAIndex;
      }

      this.selectedAIndex = Math.max(0, Math.min(_defaultSelectedAIndex, _pointCount - 1));
      this.selectedBIndex = Math.max(0, Math.min(_defaultSelectedBIndex, _pointCount - 1));
    }
  }

  window.SpaceExpansionAppState =
  {
    AppState: AppState
  };
})();
