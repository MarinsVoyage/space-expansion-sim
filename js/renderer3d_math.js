(function ()
{
  'use strict';

  // Multiplies two 4 by 4 matrices in column major order. For example multiplyMatrix4 with a and b returns a times b.
  function multiplyMatrix4(_a, _b)
  {
    const _out = new Float32Array(16);

    for (let _columnIndex = 0; _columnIndex < 4; _columnIndex++)
    {
      for (let _rowIndex = 0; _rowIndex < 4; _rowIndex++)
      {
        _out[_columnIndex * 4 + _rowIndex] =
          _a[0 * 4 + _rowIndex] * _b[_columnIndex * 4 + 0] +
          _a[1 * 4 + _rowIndex] * _b[_columnIndex * 4 + 1] +
          _a[2 * 4 + _rowIndex] * _b[_columnIndex * 4 + 2] +
          _a[3 * 4 + _rowIndex] * _b[_columnIndex * 4 + 3];
      }
    }

    return _out;
  }

  // Builds a perspective projection matrix. For example fov 55 degrees gives a moderately wide view.
  function makePerspective(_fovYRadians, _aspect, _near, _far)
  {
    const _f = 1.0 / Math.tan(_fovYRadians * 0.5);
    const _rangeInv = 1.0 / (_near - _far);

    const _m = new Float32Array(16);
    _m[0] = _f / _aspect;
    _m[1] = 0;
    _m[2] = 0;
    _m[3] = 0;

    _m[4] = 0;
    _m[5] = _f;
    _m[6] = 0;
    _m[7] = 0;

    _m[8] = 0;
    _m[9] = 0;
    _m[10] = (_near + _far) * _rangeInv;
    _m[11] = -1;

    _m[12] = 0;
    _m[13] = 0;
    _m[14] = (2 * _near * _far) * _rangeInv;
    _m[15] = 0;

    return _m;
  }

  // Creates a translation matrix for camera moves. For example z of minus 3 moves the camera back.
  function makeTranslation(_x, _y, _z)
  {
    const _m = new Float32Array(16);
    _m[0] = 1; _m[1] = 0; _m[2] = 0; _m[3] = 0;
    _m[4] = 0; _m[5] = 1; _m[6] = 0; _m[7] = 0;
    _m[8] = 0; _m[9] = 0; _m[10] = 1; _m[11] = 0;
    _m[12] = _x; _m[13] = _y; _m[14] = _z; _m[15] = 1;
    return _m;
  }

  // Creates a Y rotation matrix to spin the scene. For example angle 0.5 rotates about the up axis.
  function makeRotationY(_angleRadians)
  {
    const _c = Math.cos(_angleRadians);
    const _s = Math.sin(_angleRadians);

    const _m = new Float32Array(16);
    _m[0] = _c; _m[1] = 0; _m[2] = -_s; _m[3] = 0;
    _m[4] = 0; _m[5] = 1; _m[6] = 0; _m[7] = 0;
    _m[8] = _s; _m[9] = 0; _m[10] = _c; _m[11] = 0;
    _m[12] = 0; _m[13] = 0; _m[14] = 0; _m[15] = 1;
    return _m;
  }

  // Creates an X rotation matrix for tilt. For example angle minus 0.45 tilts down to show depth.
  function makeRotationX(_angleRadians)
  {
    const _c = Math.cos(_angleRadians);
    const _s = Math.sin(_angleRadians);

    const _m = new Float32Array(16);
    _m[0] = 1; _m[1] = 0; _m[2] = 0; _m[3] = 0;
    _m[4] = 0; _m[5] = _c; _m[6] = _s; _m[7] = 0;
    _m[8] = 0; _m[9] = -_s; _m[10] = _c; _m[11] = 0;
    _m[12] = 0; _m[13] = 0; _m[14] = 0; _m[15] = 1;
    return _m;
  }

  // Creates a scale matrix to apply expansion. For example scale 2 doubles size in each axis.
  function makeScale(_x, _y, _z)
  {
    const _m = new Float32Array(16);
    _m[0] = _x; _m[1] = 0; _m[2] = 0; _m[3] = 0;
    _m[4] = 0; _m[5] = _y; _m[6] = 0; _m[7] = 0;
    _m[8] = 0; _m[9] = 0; _m[10] = _z; _m[11] = 0;
    _m[12] = 0; _m[13] = 0; _m[14] = 0; _m[15] = 1;
    return _m;
  }

  window.SpaceExpansionRenderer3DMath =
  {
    multiplyMatrix4: multiplyMatrix4,
    makePerspective: makePerspective,
    makeTranslation: makeTranslation,
    makeRotationY: makeRotationY,
    makeRotationX: makeRotationX,
    makeScale: makeScale
  };
})();
