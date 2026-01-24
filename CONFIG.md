# Configuration Guide

This project is driven by config/space-expansion.json. The notes below explain what each section does and give a short example.

## physics
- defaultMode picks the initial expansion model. For example lcdm starts in LambdaCDM mode
- modes lists selectable modes with labels. For example value desitter shows a pure Lambda option
- parameters holds base cosmology values used for LCDM. For example aMin 0.01 avoids the a of 0 singularity
- linearTimelineGyr is the total timeline for linear mode. For example 12.0 means 12 Gyr from start to end
- timelineSampleCount is the number of samples for LCDM lookup. For example 2600 gives smooth scrubbing
- aMaxOptions lists a of t ranges. For example value 6 means the scale factor can reach 6 times
- defaultAMax is the initial maximum range. For example 3 means 1 to 3 times on load

## ui
- defaultRenderStyle is the initial renderer style. For example dots shows points
- defaultDistributionMode is the initial point layout. For example grid makes a lattice
- defaultShowBoundPoints toggles bound points. For example true shows the fixed cluster
- defaultMeasureDistance toggles measurements. For example false hides A to B distances
- renderStyles lists render styles with labels. For example voxels shows connected grids
- distributionModes lists distributions. For example random scatters points
- speedSlider sets speed input limits. For example minGyrPerSecond 0.01 is the slowest speed
- timelineSlider sets timeline input limits. For example max 1000 maps to 100 percent
- densitySlider sets grid density limits. For example defaultValue 10 yields 10 by 10 or 10 by 10 by 10
- boxSizeMpc sets comoving size used for distance display. For example 1000 means one box unit equals 1000 Mpc

## rendering
- renderer2d controls 2D size, line width, and pick thresholds. For example pickThresholdPixels 10 keeps clicks forgiving
- renderer3d controls 3D camera, rotation, and point size. For example initialRotationXRadians minus 0.45 tilts the view down
- renderer3d initialRotationYRadians and renderer3d initialRotationXRadians are the starting camera angles. For example 0 and minus 0.45
- boundPoints sets size and count of bound points. For example count 4 makes 64 points in a 4 by 4 by 4 grid
- gridSpacingScale sets cube and marker size relative to spacing. For example 0.55 is slightly smaller than full cell size
- colors2d holds RGBA colors for canvas rendering. For example boundaryStroke 231 238 252 0.35 is light blue
- colors3d holds RGBA colors for WebGL. For example point 0.42 0.7 1 0.88 is bright blue

## measurement
- labelPrecision is the decimal places for distance labels. For example 1 shows 123.4 Mpc
- statusPrecision is the decimal places for status bar values. For example 3 shows 1.234
- defaultSelectedAIndex is the initial point A index. For example 0 selects the first point
- defaultSelectedBIndexMode is the initial point B strategy. For example last picks the final grid point

## units
- secondsPerGyr is the conversion constant. For example 3.15576e16 seconds per Gyr

## numericSafety
- minScaleFactor protects divisions near zero. For example 1e-9 keeps a from becoming 0
- minDenominator avoids division by zero in integration. For example 1e-24
- minSegmentDuration avoids zero length interpolation segments. For example 1e-9
- minSegmentRange avoids zero scale ranges. For example 1e-12
- minRatio avoids log of 0 in de Sitter. For example 1e-12
- minMaxTime avoids divide by zero in timeline normalization. For example 1e-9
- minPositiveSpeedGyrPerSecond avoids incorrect speed curves. For example 1e-4 protects against zero speed
