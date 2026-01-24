(function ()
{
  'use strict';

  class Renderer2DGrid
  {
    // Holds comoving grid points and bound points for 2D rendering. For example distributionMode random scatters points.
    constructor(_config)
    {
      const _rendererConfig = (_config && _config.rendering) ? _config.rendering : {};
      const _renderer2dConfig = _rendererConfig.renderer2d || {};
      const _boundConfig = _rendererConfig.boundPoints || {};

      // Grid settings define how many points exist and how they are distributed.
      this.gridCount = 10;
      this.distributionMode = 'grid';

      // Limits keep slider values safe. For example gridCountMin 2 avoids division by zero.
      // Safe defaults avoid NaN if config is missing. For example gridCountMin falls back to 2.
      this.gridCountMin = Number.isFinite(_renderer2dConfig.gridCountMin) ? _renderer2dConfig.gridCountMin : 2;
      this.gridCountMax = Number.isFinite(_renderer2dConfig.gridCountMax) ? _renderer2dConfig.gridCountMax : 40;

      // Bound point layout is a fixed cube in proper space. For example count 4 makes a 4 by 4 square.
      // Fallbacks keep the bound cluster visible. For example extent 0.12 creates a small fixed cube.
      this.boundPointExtent = Number.isFinite(_boundConfig.extent) ? _boundConfig.extent : 0.12;
      this.boundPointCount = Number.isFinite(_boundConfig.count) ? _boundConfig.count : 4;

      this.gridPoints = [];
      this.boundPoints = [];
      this.rebuildGrid();
      this.rebuildBoundPoints();
    }

    // Sets the distribution mode and rebuilds points. For example grid makes a lattice.
    setDistributionMode(_distributionMode)
    {
      const _mode = (_distributionMode === 'random') ? 'random' : 'grid';
      this.distributionMode = _mode;
      this.rebuildGrid();
    }

    // Sets the grid resolution and rebuilds points. For example 12 means 12 by 12 grid points.
    setGridCount(_gridCount)
    {
      const _clamped = Math.max(this.gridCountMin, Math.min(this.gridCountMax, Math.floor(_gridCount)));
      this.gridCount = _clamped;
      this.rebuildGrid();
    }

    // Rebuilds comoving grid points for the current distribution. For example random mode uses Math.random.
    rebuildGrid()
    {
      const _count = Math.max(1, this.gridCount);
      const _points = [];
      const _half = 0.5;

      if (_count === 1)
      {
        // Single point stays centered to avoid divide-by-zero. For example count 1 uses x 0 and z 0.
        _points.push({ x: 0.0, z: 0.0 });
        this.gridPoints = _points;
        return;
      }

      if (this.distributionMode === 'random')
      {
        for (let _i = 0; _i < (_count * _count); _i++)
        {
          const _x = (-_half) + Math.random() * 1.0;
          const _z = (-_half) + Math.random() * 1.0;
          _points.push({ x: _x, z: _z });
        }
      }
      else
      {
        for (let _zIndex = 0; _zIndex < _count; _zIndex++)
        {
          for (let _xIndex = 0; _xIndex < _count; _xIndex++)
          {
            const _x = -_half + (_xIndex / (_count - 1)) * 1.0;
            const _z = -_half + (_zIndex / (_count - 1)) * 1.0;
            _points.push({ x: _x, z: _z });
          }
        }
      }

      this.gridPoints = _points;
    }

    // Builds a small fixed cluster of bound points to illustrate non expanding structures. For example extent 0.12 keeps it small.
    rebuildBoundPoints()
    {
      const _points = [];
      const _halfExtent = this.boundPointExtent;
      const _count = Math.max(1, this.boundPointCount);

      if (_count === 1)
      {
        // Single bound point stays centered to avoid divide-by-zero. For example count 1 uses x 0 and z 0.
        _points.push({ x: 0.0, z: 0.0 });
        this.boundPoints = _points;
        return;
      }

      for (let _zIndex = 0; _zIndex < _count; _zIndex++)
      {
        for (let _xIndex = 0; _xIndex < _count; _xIndex++)
        {
          const _x = -_halfExtent + (_xIndex / (_count - 1)) * (2.0 * _halfExtent);
          const _z = -_halfExtent + (_zIndex / (_count - 1)) * (2.0 * _halfExtent);
          _points.push({ x: _x, z: _z });
        }
      }

      this.boundPoints = _points;
    }

    // Returns a comoving point by index, or null if out of range. For example index 0 is the first point.
    getComovingPointByIndex(_index)
    {
      const _i = Math.floor(_index);

      if (_i < 0 || _i >= this.gridPoints.length)
      {
        return null;
      }

      return this.gridPoints[_i];
    }
  }

  window.SpaceExpansionRenderer2DGrid =
  {
    Renderer2DGrid: Renderer2DGrid
  };
})();
