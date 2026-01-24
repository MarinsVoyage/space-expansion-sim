# Space Expansion Simulator 2D and 3D

A small, dependency-free, full-screen visualization of **metric expansion** using a scale factor **a of t**

- Points are on a **comoving grid** so their comoving coordinates do not change
- The rendered cube and square and point separations scale by **a of t** and proper distance is proportional to a

## Scientific model

Default mode uses **flat LambdaCDM** with the Friedmann equation in a flat universe.
The model computes the Hubble rate from radiation, matter, and Lambda terms.
It integrates time by stepping the scale factor from a minimum to a maximum and storing a lookup table.
Then it interpolates a of t for smooth scrubbing and animation.

Other modes are included for comparison:

- **Pure Lambda de Sitter** uses exponential expansion
- **Linear** is a toy scaling

## Usage

Open `index.html` in a modern browser.

If your browser blocks local file access or you want JSON config to load, run a local server.

- Python command is `python -m http.server 8000`
- Then open `http://localhost:8000/`

## Configuration

All scientific and UI defaults live in:

- `config/space-expansion.json`
- `CONFIG.md` documents every config field with examples.

Notes:

- When opening `index.html` directly from a local file, the app uses a built-in fallback config from `js/config_loader.js`.
- To see edits from `config/space-expansion.json`, run a local server so the JSON file can load.

## Controls

- **Mode** is LambdaCDM or de Sitter or linear
- **Render** is dots or voxel-like squares and cubes
- **Distribution** is regular grid or randomized comoving positions
- **Speed** is simulated Gyr per second
- **Scale factor range** is the maximum shown expansion factor
- **Grid density** is the number of comoving points per axis
- **Simulation timeline** lets you jump to any simulated time. t of 0 corresponds to the minimum scale factor. The default a_min is 0.01 to avoid the a of 0 singularity
- **Box size** uses comoving Mpc and maps cube units to Mpc for the measurement readout
- **Show bound points** toggles an illustrative non-expanding bound set
- **Measure distance** draws a line between selected points and prints comoving and proper distance

Selection:

- Click in the 2D pane to set point A
- Shift+click to set point B

## Notes

This is a visualization of the scale factor in standard cosmology. It is not a particle simulation and does not include structure formation, peculiar velocities, or gravitationally bound systems resisting expansion except for the bound point overlay.

The LambdaCDM timeline includes early times by starting at a small, nonzero a_min. The default is 0.01 to avoid the Big Bang singularity at a of 0.

## Project structure

- `index.html`: main UI shell
- `config/space-expansion.json`: configurable physics + UI parameters
- `js/`: modular scripts grouped by filename prefix such as app_ core_ config_ cosmology_ renderer2d_ renderer3d_

## Credits

Uses built-in browser APIs and system fonts. Default cosmology values follow commonly cited Planck 2018 flat LambdaCDM parameters. The seconds-per-Gyr conversion uses 365.25 days per year.

## GitHub Pages

This project is a static site. Configure GitHub Pages to deploy from the repository root on your default branch.
