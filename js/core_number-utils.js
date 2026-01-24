(function ()
{
  'use strict';

  // Clamps a number to a min and max range to keep values stable. For example clampNumber with 5, 0, 3 returns 3.
  function clampNumber(_value, _minValue, _maxValue)
  {
    return Math.max(_minValue, Math.min(_maxValue, _value));
  }

  // Linearly interpolates between two numbers for smooth transitions. For example lerpNumber with 0, 10, 0.5 returns 5.
  function lerpNumber(_startValue, _endValue, _t)
  {
    return _startValue + (_endValue - _startValue) * _t;
  }

  // Rounds a number to a fixed decimal precision for display. For example roundToPrecision with 1.234 and 2 returns 1.23.
  function roundToPrecision(_value, _precision)
  {
    const _factor = Math.pow(10, Math.max(0, Math.floor(_precision)));
    return Math.round(_value * _factor) / _factor;
  }

  window.SpaceExpansionNumbers =
  {
    clampNumber: clampNumber,
    lerpNumber: lerpNumber,
    roundToPrecision: roundToPrecision
  };
})();
