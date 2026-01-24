(function ()
{
  'use strict';

  // Resizes the canvas to match CSS pixels so WebGL is crisp. For example returns true when size changed.
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

  // Compiles a shader and throws if compilation fails. For example bad GLSL source yields a clear error message.
  function createShader(_gl, _type, _source)
  {
    const _shader = _gl.createShader(_type);
    _gl.shaderSource(_shader, _source);
    _gl.compileShader(_shader);

    if (!_gl.getShaderParameter(_shader, _gl.COMPILE_STATUS))
    {
      const _log = _gl.getShaderInfoLog(_shader) || 'Unknown shader compile error';
      _gl.deleteShader(_shader);
      throw new Error(_log);
    }

    return _shader;
  }

  // Links a shader program and throws if linking fails. For example mismatched attributes will show in the log.
  function createProgram(_gl, _vertexShader, _fragmentShader)
  {
    const _program = _gl.createProgram();
    _gl.attachShader(_program, _vertexShader);
    _gl.attachShader(_program, _fragmentShader);
    _gl.linkProgram(_program);

    if (!_gl.getProgramParameter(_program, _gl.LINK_STATUS))
    {
      const _log = _gl.getProgramInfoLog(_program) || 'Unknown program link error';
      _gl.deleteProgram(_program);
      throw new Error(_log);
    }

    return _program;
  }

  class ExpansionRenderer3D
  {
    // Draws the 3D cube view using WebGL. For example renderStyle voxels draws lattice lines.
    constructor(_canvas, _config)
    {
      const _rendererConfig = (_config && _config.rendering) ? _config.rendering : {};
      const _renderer3dConfig = _rendererConfig.renderer3d || {};
      const _colors3d = _rendererConfig.colors3d || {};

      this.canvas = _canvas;
      this.gl = _canvas.getContext('webgl', { antialias: true, alpha: true, desynchronized: true });

      if (!this.gl)
      {
        throw new Error('WebGL not available');
      }

      this.gridCount = 10;
      this.maxShownScaleRelative = 3.0;

      this.renderStyle = 'dots';
      this.distributionMode = 'grid';

      // Safe defaults keep rendering stable if config is missing. For example gridCountMin falls back to 2.
      this.gridCountMin = Number.isFinite(_renderer3dConfig.gridCountMin) ? _renderer3dConfig.gridCountMin : 2;
      this.gridCountMax = Number.isFinite(_renderer3dConfig.gridCountMax) ? _renderer3dConfig.gridCountMax : 32;
      this.gridSpacingScale = Number.isFinite(_rendererConfig.gridSpacingScale) ? _rendererConfig.gridSpacingScale : 0.55;
      this.boundConfig = _rendererConfig.boundPoints || { extent: 0.12, count: 4 };
      this.renderConfig =
      {
        initialRotationYRadians: Number.isFinite(_renderer3dConfig.initialRotationYRadians) ? _renderer3dConfig.initialRotationYRadians : 0.0,
        initialRotationXRadians: Number.isFinite(_renderer3dConfig.initialRotationXRadians) ? _renderer3dConfig.initialRotationXRadians : -0.45,
        rotationSpeedRadiansPerSecond: Number.isFinite(_renderer3dConfig.rotationSpeedRadiansPerSecond) ? _renderer3dConfig.rotationSpeedRadiansPerSecond : 0.18,
        cameraDistanceScale: Number.isFinite(_renderer3dConfig.cameraDistanceScale) ? _renderer3dConfig.cameraDistanceScale : 2.2,
        fovDegrees: Number.isFinite(_renderer3dConfig.fovDegrees) ? _renderer3dConfig.fovDegrees : 55.0,
        near: Number.isFinite(_renderer3dConfig.near) ? _renderer3dConfig.near : 0.05,
        far: Number.isFinite(_renderer3dConfig.far) ? _renderer3dConfig.far : 200.0,
        pointSizeScale: Number.isFinite(_renderer3dConfig.pointSizeScale) ? _renderer3dConfig.pointSizeScale : 360.0,
        pointSizeMin: Number.isFinite(_renderer3dConfig.pointSizeMin) ? _renderer3dConfig.pointSizeMin : 2.0,
        boundPointSizeScale: Number.isFinite(_renderer3dConfig.boundPointSizeScale) ? _renderer3dConfig.boundPointSizeScale : 0.92
      };

      // Rotation values drive a slow camera motion for depth cues. For example rotationYRadians increases every frame.
      this.rotationYRadians = this.renderConfig.initialRotationYRadians;
      this.rotationXRadians = this.renderConfig.initialRotationXRadians;

      // Store colors in float form for WebGL uniforms. For example point color [0.42, 0.7, 1, 0.88].
      this.colors =
      {
        cubeLine: _colors3d.cubeLine,
        gridLine: _colors3d.gridLine,
        markerLine: _colors3d.markerLine,
        point: _colors3d.point,
        boundPoint: _colors3d.boundPoint,
        selectionPoint: _colors3d.selectionPoint,
        measurementLine: _colors3d.measurementLine
      };

      this.initPipeline();
      this.rebuildGeometry();
    }

    // Sets the render style and rebuilds geometry as needed. For example markers require marker cube lines.
    setRenderStyle(_renderStyle)
    {
      const _style = (_renderStyle === 'voxels' || _renderStyle === 'markers') ? _renderStyle : 'dots';
      this.renderStyle = _style;
      this.rebuildGeometry();
    }

    // Sets distribution mode and rebuilds geometry. For example random mode rebuilds point positions.
    setDistributionMode(_distributionMode)
    {
      this.distributionMode = (_distributionMode === 'random') ? 'random' : 'grid';
      this.rebuildGeometry();
    }

    // Sets grid count with safety limits. For example 32 gives 32^3 points.
    setGridCount(_gridCount)
    {
      const _clamped = Math.max(this.gridCountMin, Math.min(this.gridCountMax, Math.floor(_gridCount)));
      this.gridCount = _clamped;
      this.rebuildGeometry();
    }

    // Sets the maximum scale shown so the cube stays visible. For example 6 keeps the camera farther away.
    setMaxShownScaleRelative(_maxShownScaleRelative)
    {
      this.maxShownScaleRelative = Math.max(1.0, _maxShownScaleRelative);
    }

    // Builds the WebGL program and buffers. For example creates buffers for points and lines.
    initPipeline()
    {
      const _gl = this.gl;

      const _vertexSource =
      `attribute vec3 aPosition;
       uniform mat4 uMvp;
       uniform float uPointSize;
       void main()
       {
         gl_Position = uMvp * vec4(aPosition, 1.0);
         gl_PointSize = uPointSize;
       }`;

      const _fragmentSource =
      `precision mediump float;
       uniform vec4 uColor;
       uniform float uIsPoint;
       void main()
       {
         if (uIsPoint > 0.5)
         {
           vec2 c = gl_PointCoord - vec2(0.5);
           float d = dot(c, c);
           if (d > 0.25) { discard; }
         }

         gl_FragColor = uColor;
       }`;

      const _vertexShader = createShader(_gl, _gl.VERTEX_SHADER, _vertexSource);
      const _fragmentShader = createShader(_gl, _gl.FRAGMENT_SHADER, _fragmentSource);
      const _program = createProgram(_gl, _vertexShader, _fragmentShader);

      this.program = _program;
      this.attribPosition = _gl.getAttribLocation(_program, 'aPosition');
      this.uniformMvp = _gl.getUniformLocation(_program, 'uMvp');
      this.uniformColor = _gl.getUniformLocation(_program, 'uColor');
      this.uniformPointSize = _gl.getUniformLocation(_program, 'uPointSize');
      this.uniformIsPoint = _gl.getUniformLocation(_program, 'uIsPoint');

      this.bufferPoints = _gl.createBuffer();
      this.bufferCubeLines = _gl.createBuffer();
      this.bufferVoxelLines = _gl.createBuffer();
      this.bufferVoxelGridLines = _gl.createBuffer();
      this.bufferBoundPoints = _gl.createBuffer();
      this.bufferSelectedPoints = _gl.createBuffer();
      this.bufferMeasureLine = _gl.createBuffer();

      const _cubeLines = window.SpaceExpansionRenderer3DGeometry.createCubeLineSegments();
      this.baseCubeLinePositions = _cubeLines;
      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferCubeLines);
      _gl.bufferData(_gl.ARRAY_BUFFER, _cubeLines, _gl.STATIC_DRAW);
      this.cubeLineVertexCount = _cubeLines.length / 3;

      const _boundPoints = window.SpaceExpansionRenderer3DGeometry.createBoundPoints(this.boundConfig);
      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferBoundPoints);
      _gl.bufferData(_gl.ARRAY_BUFFER, _boundPoints, _gl.STATIC_DRAW);
      this.boundPointVertexCount = _boundPoints.length / 3;

      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferSelectedPoints);
      _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(6), _gl.DYNAMIC_DRAW);

      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferMeasureLine);
      _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(6), _gl.DYNAMIC_DRAW);

      _gl.enable(_gl.DEPTH_TEST);
      _gl.depthFunc(_gl.LEQUAL);
      _gl.enable(_gl.BLEND);
      _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA);
    }

    // Rebuilds points and line buffers when density or style changes. For example random points are regenerated.
    rebuildGeometry()
    {
      const _count = Math.max(1, Math.floor(this.gridCount));
      const _half = 0.5;
      const _pointCount = _count * _count * _count;
      const _positions = new Float32Array(_pointCount * 3);

      let _offset = 0;

      if (_count === 1)
      {
        // Single point stays centered to avoid divide-by-zero. For example count 1 uses x 0, y 0, z 0.
        _positions[_offset++] = 0.0;
        _positions[_offset++] = 0.0;
        _positions[_offset++] = 0.0;
      }
      else if (this.distributionMode === 'random')
      {
        for (let _i = 0; _i < _pointCount; _i++)
        {
          _positions[_offset++] = (-_half) + Math.random() * 1.0;
          _positions[_offset++] = (-_half) + Math.random() * 1.0;
          _positions[_offset++] = (-_half) + Math.random() * 1.0;
        }
      }
      else
      {
        for (let _zIndex = 0; _zIndex < _count; _zIndex++)
        {
          for (let _yIndex = 0; _yIndex < _count; _yIndex++)
          {
            for (let _xIndex = 0; _xIndex < _count; _xIndex++)
            {
              const _x = -_half + (_xIndex / (_count - 1)) * 1.0;
              const _y = -_half + (_yIndex / (_count - 1)) * 1.0;
              const _z = -_half + (_zIndex / (_count - 1)) * 1.0;

              _positions[_offset++] = _x;
              _positions[_offset++] = _y;
              _positions[_offset++] = _z;
            }
          }
        }
      }

      const _gl = this.gl;
      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferPoints);
      _gl.bufferData(_gl.ARRAY_BUFFER, _positions, _gl.STATIC_DRAW);

      this.pointVertexCount = _pointCount;

      // Voxel grid with connected cells builds a comoving lattice that expands with a of t.
      if (this.distributionMode === 'grid')
      {
        const _voxelGridLinePositions = window.SpaceExpansionRenderer3DGeometry.createVoxelGridLineSegments(_count);
        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferVoxelGridLines);
        _gl.bufferData(_gl.ARRAY_BUFFER, _voxelGridLinePositions, _gl.STATIC_DRAW);
        this.voxelGridLineVertexCount = _voxelGridLinePositions.length / 3;
      }
      else
      {
        this.voxelGridLineVertexCount = 0;
      }

      // Marker cubes are local square and cube glyphs around each comoving point for visual aid.
      const _shouldBuildMarkerCubes =
        (this.renderStyle === 'markers') ||
        (this.renderStyle === 'voxels' && this.distributionMode === 'random');

      const _baseCube = this.baseCubeLinePositions;

      if (_shouldBuildMarkerCubes && _baseCube && _baseCube.length > 0)
      {
        const _spacingDenominator = Math.max(1, (_count - 1));
        const _spacingComoving = (this.distributionMode === 'random') ? (1.0 / _count) : (1.0 / _spacingDenominator);
        const _voxelSideComoving = _spacingComoving * this.gridSpacingScale;

        const _perVoxelVertexCount = this.cubeLineVertexCount;
        const _voxelLineVertexCount = _perVoxelVertexCount * _pointCount;
        const _voxelLinePositions = new Float32Array(_voxelLineVertexCount * 3);

        let _voxelOffset = 0;

        for (let _pIndex = 0; _pIndex < _pointCount; _pIndex++)
        {
          const _baseIndex = _pIndex * 3;
          const _px = _positions[_baseIndex + 0];
          const _py = _positions[_baseIndex + 1];
          const _pz = _positions[_baseIndex + 2];

          for (let _i = 0; _i < _baseCube.length; _i += 3)
          {
            _voxelLinePositions[_voxelOffset++] = _px + _baseCube[_i + 0] * _voxelSideComoving;
            _voxelLinePositions[_voxelOffset++] = _py + _baseCube[_i + 1] * _voxelSideComoving;
            _voxelLinePositions[_voxelOffset++] = _pz + _baseCube[_i + 2] * _voxelSideComoving;
          }
        }

        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferVoxelLines);
        _gl.bufferData(_gl.ARRAY_BUFFER, _voxelLinePositions, _gl.STATIC_DRAW);
        this.voxelLineVertexCount = _voxelLineVertexCount;
      }
      else
      {
        this.voxelLineVertexCount = 0;
      }
    }

    // Renders the scene at the given scale factor. For example showMeasurement draws A-B line.
    render(_scaleRelative, _deltaSeconds, _renderOptions)
    {
      setCanvasSizeToDisplaySize(this.canvas);

      const _options = _renderOptions || {};
      const _showBoundPoints = Boolean(_options.showBoundPoints);
      const _showMeasurement = Boolean(_options.showMeasurement);
      const _selectionA = (_options.selectedAComoving && _options.selectedAComoving.length === 3) ? _options.selectedAComoving : null;
      const _selectionB = (_options.selectedBComoving && _options.selectedBComoving.length === 3) ? _options.selectedBComoving : null;

      const _gl = this.gl;
      const _width = this.canvas.width;
      const _height = this.canvas.height;

      _gl.viewport(0, 0, _width, _height);
      _gl.clearColor(0, 0, 0, 0);
      _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

      // Small rotation helps depth perception and it is camera motion not physical motion.
      this.rotationYRadians += Math.max(0.0, _deltaSeconds) * this.renderConfig.rotationSpeedRadiansPerSecond;

      const _aspect = _width / Math.max(1.0, _height);
      const _projection = window.SpaceExpansionRenderer3DMath.makePerspective(
        this.renderConfig.fovDegrees * Math.PI / 180.0,
        _aspect,
        this.renderConfig.near,
        this.renderConfig.far
      );

      // Fit the maximum chosen expansion into view so the cube remains visible.
      const _maxScale = this.maxShownScaleRelative;
      const _cameraDistance = this.renderConfig.cameraDistanceScale * _maxScale;

      const _view = window.SpaceExpansionRenderer3DMath.makeTranslation(0, 0, -_cameraDistance);
      const _rotationY = window.SpaceExpansionRenderer3DMath.makeRotationY(this.rotationYRadians);
      const _rotationX = window.SpaceExpansionRenderer3DMath.makeRotationX(this.rotationXRadians);
      const _modelRotation = window.SpaceExpansionRenderer3DMath.multiplyMatrix4(_rotationY, _rotationX);
      const _scale = window.SpaceExpansionRenderer3DMath.makeScale(_scaleRelative, _scaleRelative, _scaleRelative);
      const _modelScaled = window.SpaceExpansionRenderer3DMath.multiplyMatrix4(_modelRotation, _scale);
      const _vp = window.SpaceExpansionRenderer3DMath.multiplyMatrix4(_projection, _view);
      const _mvpScaled = window.SpaceExpansionRenderer3DMath.multiplyMatrix4(_vp, _modelScaled);
      const _mvpUnscaled = window.SpaceExpansionRenderer3DMath.multiplyMatrix4(_vp, _modelRotation);

      _gl.useProgram(this.program);
      _gl.enableVertexAttribArray(this.attribPosition);

      // Cube lines expand with scale factor
      _gl.uniformMatrix4fv(this.uniformMvp, false, _mvpScaled);
      _gl.uniform1f(this.uniformIsPoint, 0.0);

      _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferCubeLines);
      _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
      _gl.uniform4f(this.uniformColor, this.colors.cubeLine[0], this.colors.cubeLine[1], this.colors.cubeLine[2], this.colors.cubeLine[3]);
      _gl.uniform1f(this.uniformPointSize, 1.0);
      _gl.drawArrays(_gl.LINES, 0, this.cubeLineVertexCount);

      const _pointSize = Math.max(this.renderConfig.pointSizeMin, (Math.min(_width, _height) / this.renderConfig.pointSizeScale) * (window.devicePixelRatio || 1));

      const _useVoxelGrid =
        (this.renderStyle === 'voxels') &&
        (this.distributionMode === 'grid') &&
        (this.voxelGridLineVertexCount > 0);

      const _useMarkerCubes =
        ((this.renderStyle === 'markers') ||
         (this.renderStyle === 'voxels' && this.distributionMode === 'random')) &&
        (this.voxelLineVertexCount > 0);

      // Hubble flow structure with comoving fixed points that expand with the scale factor
      if (_useVoxelGrid)
      {
        _gl.uniform1f(this.uniformIsPoint, 0.0);
        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferVoxelGridLines);
        _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
        _gl.uniform4f(this.uniformColor, this.colors.gridLine[0], this.colors.gridLine[1], this.colors.gridLine[2], this.colors.gridLine[3]);
        _gl.uniform1f(this.uniformPointSize, 1.0);
        _gl.drawArrays(_gl.LINES, 0, this.voxelGridLineVertexCount);
      }
      else if (_useMarkerCubes)
      {
        _gl.uniform1f(this.uniformIsPoint, 0.0);
        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferVoxelLines);
        _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
        _gl.uniform4f(this.uniformColor, this.colors.markerLine[0], this.colors.markerLine[1], this.colors.markerLine[2], this.colors.markerLine[3]);
        _gl.uniform1f(this.uniformPointSize, 1.0);
        _gl.drawArrays(_gl.LINES, 0, this.voxelLineVertexCount);
      }
      else
      {
        _gl.uniform1f(this.uniformIsPoint, 1.0);
        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferPoints);
        _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
        _gl.uniform1f(this.uniformPointSize, _pointSize);
        _gl.uniform4f(this.uniformColor, this.colors.point[0], this.colors.point[1], this.colors.point[2], this.colors.point[3]);
        _gl.drawArrays(_gl.POINTS, 0, this.pointVertexCount);
      }

      // Bound points with fixed proper positions that do not scale with a
      if (_showBoundPoints)
      {
        _gl.uniformMatrix4fv(this.uniformMvp, false, _mvpUnscaled);
        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferBoundPoints);
        _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
        _gl.uniform1f(this.uniformPointSize, Math.max(this.renderConfig.pointSizeMin, _pointSize * this.renderConfig.boundPointSizeScale));
        _gl.uniform4f(this.uniformColor, this.colors.boundPoint[0], this.colors.boundPoint[1], this.colors.boundPoint[2], this.colors.boundPoint[3]);
        _gl.drawArrays(_gl.POINTS, 0, this.boundPointVertexCount);
      }

      // Measurement line and selected highlights for Hubble flow
      const _hasSelection =
        _selectionA && _selectionB &&
        _selectionA.length === 3 && _selectionB.length === 3;

      if (_hasSelection)
      {
        const _selectedPositions = new Float32Array(
        [
          _selectionA[0], _selectionA[1], _selectionA[2],
          _selectionB[0], _selectionB[1], _selectionB[2]
        ]);

        _gl.uniformMatrix4fv(this.uniformMvp, false, _mvpScaled);

        // Selected points
        _gl.uniform1f(this.uniformIsPoint, 1.0);
        _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferSelectedPoints);
        _gl.bufferSubData(_gl.ARRAY_BUFFER, 0, _selectedPositions);
        _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
        _gl.uniform1f(this.uniformPointSize, _pointSize * 2.0);
        _gl.uniform4f(this.uniformColor, this.colors.selectionPoint[0], this.colors.selectionPoint[1], this.colors.selectionPoint[2], this.colors.selectionPoint[3]);
        _gl.drawArrays(_gl.POINTS, 0, 2);

        if (_showMeasurement)
        {
          _gl.uniform1f(this.uniformIsPoint, 0.0);
          _gl.bindBuffer(_gl.ARRAY_BUFFER, this.bufferMeasureLine);
          _gl.bufferSubData(_gl.ARRAY_BUFFER, 0, _selectedPositions);
          _gl.vertexAttribPointer(this.attribPosition, 3, _gl.FLOAT, false, 0, 0);
          _gl.uniform4f(this.uniformColor, this.colors.measurementLine[0], this.colors.measurementLine[1], this.colors.measurementLine[2], this.colors.measurementLine[3]);
          _gl.uniform1f(this.uniformPointSize, 1.0);
          _gl.drawArrays(_gl.LINES, 0, 2);
        }
      }
    }
  }

  window.SpaceExpansionRenderer3D =
  {
    ExpansionRenderer3D: ExpansionRenderer3D
  };
})();
