(function ()
{
  'use strict';

  // Gets a DOM element by id and fails fast if missing to avoid silent UI bugs. For example call getElementByIdRequired with canvas2d.
  function getElementByIdRequired(_id)
  {
    const _element = document.getElementById(_id);

    if (!_element)
    {
      throw new Error('Missing element ' + _id);
    }

    return _element;
  }

  // Creates a select option element from a value and label pair. For example call buildOption with lcdm and Flat LambdaCDM.
  function buildOption(_value, _label)
  {
    const _option = document.createElement('option');
    _option.value = String(_value);
    _option.textContent = String(_label);
    return _option;
  }

  window.SpaceExpansionDom =
  {
    getElementByIdRequired: getElementByIdRequired,
    buildOption: buildOption
  };
})();
