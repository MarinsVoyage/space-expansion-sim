(function ()
{
  'use strict';

  // Resizes the canvas to match CSS pixels for crisp rendering. For example returns true when a resize happened.
  function setCanvasSizeToDisplaySize(_canvas)
  {
    const _devicePixelRatio = window.devicePixelRatio || 1;
    const _displayWidth = Math.max(1, Math.floor(_canvas.clientWidth * _devicePixelRatio));
    const _displayHeight = Math.max(1, Math.floor(_canvas.clientHeight * _devicePixelRatio));

    if (_canvas.width !== _displayWidth || _canvas.height !== _displayHeight)
    {
      _canvas.width = _displayWidth;
      _canvas.height = _displayHeight;
      return true;
    }

    return false;
  }

  // Builds a CSS rgba color string from config values. For example a 255 255 255 0.5 value becomes an rgba string.
  function buildRgbaString(_rgbaArray)
  {
    if (!_rgbaArray || _rgbaArray.length < 4)
    {
      return 'rgba(255,255,255,1)';
    }

    return 'rgba(' + _rgbaArray[0] + ', ' + _rgbaArray[1] + ', ' + _rgbaArray[2] + ', ' + _rgbaArray[3] + ')';
  }

  // Computes the canvas-to-world transform so scaling stays centered. For example maxScalePadding keeps the cube inside view.
  function computeViewTransform(_canvas, _scaleRelative, _maxShownScaleRelative, _viewConfig)
  {
    const _width = _canvas.width;
    const _height = _canvas.height;
    const _centerX = _width * 0.5;
    const _centerY = _height * 0.5;
    const _minDim = Math.min(_width, _height);

    const _maxShownScale = _maxShownScaleRelative || 3.0;
    const _halfExtentComoving = 0.5;
    const _halfExtentMaxProper = _halfExtentComoving * _maxShownScale;
    const _pixelsPerUnit = (_minDim * _viewConfig.maxScalePadding) / _halfExtentMaxProper;

    const _halfExtentNowProper = _halfExtentComoving * _scaleRelative;
    const _halfSizePixels = _halfExtentNowProper * _pixelsPerUnit;

    return {
      centerX: _centerX,
      centerY: _centerY,
      minDim: _minDim,
      pixelsPerUnit: _pixelsPerUnit,
      halfSizePixels: _halfSizePixels
    };
  }

  // Computes voxel half-size in pixels for marker squares. For example smaller grids yield larger voxels.
  function getVoxelHalfSizePixels(_gridCount, _distributionMode, _scaleRelative, _view, _viewConfig, _gridSpacingScale)
  {
    const _count = Math.max(1, Math.floor(_gridCount));
    const _spacingDenominator = Math.max(1, (_count - 1));
    const _spacingComoving = (_distributionMode === 'random') ? (1.0 / _count) : (1.0 / _spacingDenominator);
    const _voxelSideComoving = _spacingComoving * _gridSpacingScale;
    const _voxelSidePixels = _voxelSideComoving * _scaleRelative * _view.pixelsPerUnit;
    return Math.max(_viewConfig.voxelHalfSizeMin, _voxelSidePixels * 0.5);
  }

  window.SpaceExpansionRenderer2DView =
  {
    setCanvasSizeToDisplaySize: setCanvasSizeToDisplaySize,
    buildRgbaString: buildRgbaString,
    computeViewTransform: computeViewTransform,
    getVoxelHalfSizePixels: getVoxelHalfSizePixels
  };
})();
