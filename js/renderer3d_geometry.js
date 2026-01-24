(function ()
{
  'use strict';

  // Creates line segments for a unit cube outline. For example used to draw the expanding cube frame.
  function createCubeLineSegments()
  {
    const _h = 0.5;

    const _corners =
    [
      [-_h, -_h, -_h],
      [_h, -_h, -_h],
      [_h, _h, -_h],
      [-_h, _h, -_h],
      [-_h, -_h, _h],
      [_h, -_h, _h],
      [_h, _h, _h],
      [-_h, _h, _h]
    ];

    const _edges =
    [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    const _positions = [];

    for (let _i = 0; _i < _edges.length; _i++)
    {
      const _a = _corners[_edges[_i][0]];
      const _b = _corners[_edges[_i][1]];

      _positions.push(_a[0], _a[1], _a[2]);
      _positions.push(_b[0], _b[1], _b[2]);
    }

    return new Float32Array(_positions);
  }

  // Creates line segments for a voxel grid lattice. For example count 6 draws a 6 by 6 by 6 lattice.
  function createVoxelGridLineSegments(_count)
  {
    const _n = Math.max(1, Math.floor(_count));
    const _half = 0.5;

    if (_n === 1)
    {
      // No grid lines for a single point. For example count 1 returns an empty array.
      return new Float32Array(0);
    }

    const _positions = [];

    // Lines parallel to X for each y and z
    for (let _yIndex = 0; _yIndex < _n; _yIndex++)
    {
      const _y = -_half + (_yIndex / (_n - 1)) * 1.0;

      for (let _zIndex = 0; _zIndex < _n; _zIndex++)
      {
        const _z = -_half + (_zIndex / (_n - 1)) * 1.0;

        _positions.push(-_half, _y, _z);
        _positions.push(_half, _y, _z);
      }
    }

    // Lines parallel to Y for each x and z
    for (let _xIndex = 0; _xIndex < _n; _xIndex++)
    {
      const _x = -_half + (_xIndex / (_n - 1)) * 1.0;

      for (let _zIndex = 0; _zIndex < _n; _zIndex++)
      {
        const _z = -_half + (_zIndex / (_n - 1)) * 1.0;

        _positions.push(_x, -_half, _z);
        _positions.push(_x, _half, _z);
      }
    }

    // Lines parallel to Z for each x and y
    for (let _xIndex = 0; _xIndex < _n; _xIndex++)
    {
      const _x = -_half + (_xIndex / (_n - 1)) * 1.0;

      for (let _yIndex = 0; _yIndex < _n; _yIndex++)
      {
        const _y = -_half + (_yIndex / (_n - 1)) * 1.0;

        _positions.push(_x, _y, -_half);
        _positions.push(_x, _y, _half);
      }
    }

    return new Float32Array(_positions);
  }

  // Creates a small cluster of bound points to illustrate non-expanding objects. For example count 4 makes 4^3 points.
  function createBoundPoints(_boundConfig)
  {
    const _halfExtent = _boundConfig.extent;
    const _count = Math.max(1, _boundConfig.count);

    const _positions = [];

    if (_count === 1)
    {
      // Single bound point stays centered to avoid divide-by-zero. For example count 1 uses x 0, y 0, z 0.
      return new Float32Array([0.0, 0.0, 0.0]);
    }

    for (let _zIndex = 0; _zIndex < _count; _zIndex++)
    {
      for (let _yIndex = 0; _yIndex < _count; _yIndex++)
      {
        for (let _xIndex = 0; _xIndex < _count; _xIndex++)
        {
          const _x = -_halfExtent + (_xIndex / (_count - 1)) * (2.0 * _halfExtent);
          const _y = -_halfExtent + (_yIndex / (_count - 1)) * (2.0 * _halfExtent);
          const _z = -_halfExtent + (_zIndex / (_count - 1)) * (2.0 * _halfExtent);
          _positions.push(_x, _y, _z);
        }
      }
    }

    return new Float32Array(_positions);
  }

  window.SpaceExpansionRenderer3DGeometry =
  {
    createCubeLineSegments: createCubeLineSegments,
    createVoxelGridLineSegments: createVoxelGridLineSegments,
    createBoundPoints: createBoundPoints
  };
})();
