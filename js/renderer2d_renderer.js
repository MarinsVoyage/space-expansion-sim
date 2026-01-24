(function ()
{
  'use strict';

  class ExpansionRenderer2D
  {
    // Draws the 2D view onto a canvas using a config driven style. For example renderStyle voxels shows a lattice.
    constructor(_canvas, _config)
    {
      const _rendererConfig = (_config && _config.rendering) ? _config.rendering : {};
      const _renderer2dConfig = _rendererConfig.renderer2d || {};
      const _viewConfig = _renderer2dConfig.view || {};
      const _colors2d = _rendererConfig.colors2d || {};

      this.canvas = _canvas;
      this.context = _canvas.getContext('2d', { alpha: true, desynchronized: true });

      this.grid = new window.SpaceExpansionRenderer2DGrid.Renderer2DGrid(_config);
      this.viewConfig = _viewConfig;
      // Safe default keeps voxel sizing stable if config is missing. For example 0.55 matches default cell size.
      this.gridSpacingScale = Number.isFinite(_rendererConfig.gridSpacingScale) ? _rendererConfig.gridSpacingScale : 0.55;

      this.renderStyle = 'dots';
      this.maxShownScaleRelative = 3.0;

      // Precompute CSS color strings for fast rendering. For example boundaryStroke defines the box outline.
      this.colors =
      {
        boundaryStroke: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.boundaryStroke),
        measurementLine: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.measurementLine),
        measurementLabelFill: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.measurementLabelFill),
        measurementLabelStroke: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.measurementLabelStroke),
        measurementLabelText: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.measurementLabelText),
        gridLine: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.gridLine),
        boundPoint: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.boundPoint),
        gridPoint: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.gridPoint),
        gridPointVoxel: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.gridPointVoxel),
        highlightStroke: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.highlightStroke),
        crosshair: window.SpaceExpansionRenderer2DView.buildRgbaString(_colors2d.crosshair)
      };
    }

    // Sets the render style to dots, markers, or voxels. For example markers uses square glyphs.
    setRenderStyle(_renderStyle)
    {
      const _style = (_renderStyle === 'voxels' || _renderStyle === 'markers') ? _renderStyle : 'dots';
      this.renderStyle = _style;
    }

    // Sets distribution mode for grid or random and updates the grid data. For example random mode scatters points.
    setDistributionMode(_distributionMode)
    {
      this.grid.setDistributionMode(_distributionMode);
    }

    // Sets grid density and rebuilds points. For example 16 gives a 16 by 16 grid.
    setGridCount(_gridCount)
    {
      this.grid.setGridCount(_gridCount);
    }

    // Returns a comoving point by index for measurement logic. For example index 0 is the first point.
    getComovingPointByIndex(_index)
    {
      return this.grid.getComovingPointByIndex(_index);
    }

    // Updates the maximum scale shown so the box stays in frame. For example 6 means 6 times expansion.
    setMaxShownScaleRelative(_maxShownScaleRelative)
    {
      this.maxShownScaleRelative = Math.max(1.0, _maxShownScaleRelative);
    }

    // Picks the nearest point to a mouse click. For example returns null when click is too far from points.
    pickPointFromClientCoordinates(_clientX, _clientY, _scaleRelative)
    {
      window.SpaceExpansionRenderer2DView.setCanvasSizeToDisplaySize(this.canvas);

      const _rect = this.canvas.getBoundingClientRect();
      const _devicePixelRatio = window.devicePixelRatio || 1;
      const _xCanvas = (_clientX - _rect.left) * _devicePixelRatio;
      const _yCanvas = (_clientY - _rect.top) * _devicePixelRatio;

      const _view = window.SpaceExpansionRenderer2DView.computeViewTransform(this.canvas, _scaleRelative, this.maxShownScaleRelative, this.viewConfig);

      const _threshold = Math.max(this.viewConfig.pickThresholdPixels * _devicePixelRatio, _view.minDim * this.viewConfig.pickThresholdMinDimScale);
      let _bestIndex = null;
      let _bestDistanceSquared = _threshold * _threshold;

      for (let _i = 0; _i < this.grid.gridPoints.length; _i++)
      {
        const _p = this.grid.gridPoints[_i];
        const _px = _view.centerX + _p.x * _scaleRelative * _view.pixelsPerUnit;
        const _py = _view.centerY + _p.z * _scaleRelative * _view.pixelsPerUnit;

        const _dx = _xCanvas - _px;
        const _dy = _yCanvas - _py;
        const _d2 = _dx * _dx + _dy * _dy;

        if (_d2 < _bestDistanceSquared)
        {
          _bestDistanceSquared = _d2;
          _bestIndex = _i;
        }
      }

      return _bestIndex;
    }

    // Renders the entire 2D scene given the scale factor and options. For example showMeasurement draws a line.
    render(_scaleRelative, _renderOptions)
    {
      window.SpaceExpansionRenderer2DView.setCanvasSizeToDisplaySize(this.canvas);

      const _options = _renderOptions || {};
      const _showBoundPoints = Boolean(_options.showBoundPoints);
      const _showMeasurement = Boolean(_options.showMeasurement);

      const _showVoxelGrid = (this.renderStyle === 'voxels' && this.grid.distributionMode === 'grid');
      const _useMarkerSquares =
        (this.renderStyle === 'markers') ||
        (this.renderStyle === 'voxels' && this.grid.distributionMode === 'random');

      const _selectedAIndex = Number.isFinite(_options.selectedAIndex) ? Math.floor(_options.selectedAIndex) : null;
      const _selectedBIndex = Number.isFinite(_options.selectedBIndex) ? Math.floor(_options.selectedBIndex) : null;

      const _measurementLabel = (typeof _options.measurementLabel === 'string') ? _options.measurementLabel : '';

      const _ctx = this.context;
      const _width = this.canvas.width;
      const _height = this.canvas.height;

      _ctx.clearRect(0, 0, _width, _height);

      const _view = window.SpaceExpansionRenderer2DView.computeViewTransform(this.canvas, _scaleRelative, this.maxShownScaleRelative, this.viewConfig);

      // Boundary proper size square.
      _ctx.save();
      _ctx.translate(_view.centerX, _view.centerY);

      _ctx.strokeStyle = this.colors.boundaryStroke;
      _ctx.lineWidth = Math.max(1, Math.floor((_view.minDim / this.viewConfig.boundaryLineScale) * (window.devicePixelRatio || 1)));
      _ctx.strokeRect(-_view.halfSizePixels, -_view.halfSizePixels, 2.0 * _view.halfSizePixels, 2.0 * _view.halfSizePixels);

      // Measurement line from A to B in the expanding grid.
      if (_showMeasurement && _selectedAIndex !== null && _selectedBIndex !== null && _selectedAIndex !== _selectedBIndex)
      {
        const _aPoint = this.getComovingPointByIndex(_selectedAIndex);
        const _bPoint = this.getComovingPointByIndex(_selectedBIndex);

        if (_aPoint && _bPoint)
        {
          const _ax = _aPoint.x * _scaleRelative * _view.pixelsPerUnit;
          const _ay = _aPoint.z * _scaleRelative * _view.pixelsPerUnit;
          const _bx = _bPoint.x * _scaleRelative * _view.pixelsPerUnit;
          const _by = _bPoint.z * _scaleRelative * _view.pixelsPerUnit;

          _ctx.strokeStyle = this.colors.measurementLine;
          _ctx.lineWidth = Math.max(1, Math.floor((_view.minDim / this.viewConfig.measurementLineScale) * (window.devicePixelRatio || 1)));
          _ctx.beginPath();
          _ctx.moveTo(_ax, _ay);
          _ctx.lineTo(_bx, _by);
          _ctx.stroke();

          if (_measurementLabel)
          {
            const _midX = 0.5 * (_ax + _bx);
            const _midY = 0.5 * (_ay + _by);

            _ctx.font = Math.max(11, Math.floor((_view.minDim / this.viewConfig.measurementFontScale))) + 'px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'middle';

            const _padding = this.viewConfig.labelPadding * (window.devicePixelRatio || 1);
            const _metrics = _ctx.measureText(_measurementLabel);
            const _w = _metrics.width + _padding * 2;
            const _h = Math.max(this.viewConfig.measurementLabelMinHeight, _view.minDim * this.viewConfig.measurementLabelHeightScale);

            _ctx.fillStyle = this.colors.measurementLabelFill;
            _ctx.strokeStyle = this.colors.measurementLabelStroke;
            _ctx.lineWidth = Math.max(1, Math.floor((_view.minDim / this.viewConfig.measurementLineScale) * (window.devicePixelRatio || 1)));
            _ctx.beginPath();
            _ctx.rect(_midX - _w * 0.5, _midY - _h * 0.5, _w, _h);
            _ctx.fill();
            _ctx.stroke();

            _ctx.fillStyle = this.colors.measurementLabelText;
            _ctx.fillText(_measurementLabel, _midX, _midY);
          }
        }
      }

      // Voxel grid cells: draw an expanding lattice so voxel corners are visibly connected.
      if (_showVoxelGrid)
      {
        const _count = Math.max(2, Math.floor(this.grid.gridCount));
        const _halfSize = _view.halfSizePixels;

        _ctx.strokeStyle = this.colors.gridLine;
        _ctx.lineWidth = Math.max(1, Math.floor((_view.minDim / this.viewConfig.gridLineScale) * (window.devicePixelRatio || 1)));

        for (let _i = 0; _i < _count; _i++)
        {
          const _t = (_count === 1) ? 0.0 : (_i / (_count - 1));
          const _x = (-0.5 + _t) * _scaleRelative * _view.pixelsPerUnit;

          _ctx.beginPath();
          _ctx.moveTo(_x, -_halfSize);
          _ctx.lineTo(_x, _halfSize);
          _ctx.stroke();
        }

        for (let _j = 0; _j < _count; _j++)
        {
          const _t = (_count === 1) ? 0.0 : (_j / (_count - 1));
          const _y = (-0.5 + _t) * _scaleRelative * _view.pixelsPerUnit;

          _ctx.beginPath();
          _ctx.moveTo(-_halfSize, _y);
          _ctx.lineTo(_halfSize, _y);
          _ctx.stroke();
        }
      }

      // Bound non expanding points fixed in proper space.
      if (_showBoundPoints)
      {
        const _boundRadius = Math.max(this.viewConfig.boundPointRadiusMin, (_view.minDim / this.viewConfig.boundPointRadiusScale) * (window.devicePixelRatio || 1));
        _ctx.fillStyle = this.colors.boundPoint;

        const _voxelHalfSizePixels = window.SpaceExpansionRenderer2DView.getVoxelHalfSizePixels(
          this.grid.gridCount,
          this.grid.distributionMode,
          _scaleRelative,
          _view,
          this.viewConfig,
          this.gridSpacingScale
        ) * this.viewConfig.voxelHalfSizeBoundScale;

        for (let _i = 0; _i < this.grid.boundPoints.length; _i++)
        {
          const _p = this.grid.boundPoints[_i];
          const _x = _p.x * _view.pixelsPerUnit;
          const _y = _p.z * _view.pixelsPerUnit;

          if (_useMarkerSquares)
          {
            _ctx.fillRect(_x - _voxelHalfSizePixels, _y - _voxelHalfSizePixels, 2.0 * _voxelHalfSizePixels, 2.0 * _voxelHalfSizePixels);
          }
          else
          {
            _ctx.beginPath();
            _ctx.arc(_x, _y, _boundRadius, 0, Math.PI * 2.0);
            _ctx.fill();
          }
        }
      }

      // Draw grid points with comoving fixed positions mapped into proper positions.
      const _pointRadius = Math.max(this.viewConfig.pointRadiusMin, (_view.minDim / this.viewConfig.pointRadiusScale) * (window.devicePixelRatio || 1));
      const _cornerRadius = _showVoxelGrid ? Math.max(this.viewConfig.cornerRadiusMin, _pointRadius * this.viewConfig.cornerRadiusScale) : _pointRadius;
      _ctx.fillStyle = _showVoxelGrid ? this.colors.gridPointVoxel : this.colors.gridPoint;

      const _voxelHalfSizePixels = window.SpaceExpansionRenderer2DView.getVoxelHalfSizePixels(
        this.grid.gridCount,
        this.grid.distributionMode,
        _scaleRelative,
        _view,
        this.viewConfig,
        this.gridSpacingScale
      );

      for (let _i = 0; _i < this.grid.gridPoints.length; _i++)
      {
        const _p = this.grid.gridPoints[_i];
        const _x = _p.x * _scaleRelative * _view.pixelsPerUnit;
        const _y = _p.z * _scaleRelative * _view.pixelsPerUnit;

        if (_useMarkerSquares)
        {
          _ctx.fillRect(_x - _voxelHalfSizePixels, _y - _voxelHalfSizePixels, 2.0 * _voxelHalfSizePixels, 2.0 * _voxelHalfSizePixels);
        }
        else
        {
          _ctx.beginPath();
          _ctx.arc(_x, _y, _cornerRadius, 0, Math.PI * 2.0);
          _ctx.fill();
        }
      }

      // Selected point highlights.
      const _highlightRadius = _pointRadius * this.viewConfig.selectionHighlightScale;
      _ctx.strokeStyle = this.colors.highlightStroke;
      _ctx.lineWidth = Math.max(1, Math.floor((_view.minDim / this.viewConfig.highlightLineScale) * (window.devicePixelRatio || 1)));

      const _highlightIndices = [];

      if (_selectedAIndex !== null)
      {
        _highlightIndices.push(_selectedAIndex);
      }

      if (_selectedBIndex !== null && _selectedBIndex !== _selectedAIndex)
      {
        _highlightIndices.push(_selectedBIndex);
      }

      for (let _i = 0; _i < _highlightIndices.length; _i++)
      {
        const _p = this.getComovingPointByIndex(_highlightIndices[_i]);

        if (!_p)
        {
          continue;
        }

        const _x = _p.x * _scaleRelative * _view.pixelsPerUnit;
        const _y = _p.z * _scaleRelative * _view.pixelsPerUnit;

        if (_useMarkerSquares)
        {
          const _half = _voxelHalfSizePixels * 1.35;
          _ctx.strokeRect(_x - _half, _y - _half, 2.0 * _half, 2.0 * _half);
        }
        else
        {
          _ctx.beginPath();
          _ctx.arc(_x, _y, _highlightRadius, 0, Math.PI * 2.0);
          _ctx.stroke();
        }
      }

      // Crosshair for orientation.
      _ctx.strokeStyle = this.colors.crosshair;
      _ctx.beginPath();
      _ctx.moveTo(-_view.minDim, 0);
      _ctx.lineTo(_view.minDim, 0);
      _ctx.moveTo(0, -_view.minDim);
      _ctx.lineTo(0, _view.minDim);
      _ctx.stroke();

      _ctx.restore();
    }
  }

  window.SpaceExpansionRenderer2D =
  {
    ExpansionRenderer2D: ExpansionRenderer2D
  };
})();
