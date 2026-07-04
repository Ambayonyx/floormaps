# FloorMaps

A simple browser-based floorplan viewer powered by a YAML configuration file.

`floorplan.yaml` defines buildings and floors, and the app displays the selected floor plan image in the browser.

## Features

- Load floorplan definitions from a local `floorplan.yaml`
- Switch between buildings and floors with dropdown selectors
- Preview floor plan images directly in the browser
- Keyboard navigation for buildings and floors
- Touch swipe support for mobile devices
- Automatic image availability check for all configured floor plans

## Quickstart

1. Open `index.html` in your browser.
2. Click **Load floorplan.yaml**.
3. Select the `floorplan.yaml` file from this directory.
4. Choose a building and floor from the selectors.

> If you open the page from the filesystem, use the button to load `floorplan.yaml` from the same folder.

## Running locally

- Open `index.html` in any modern browser.
- Or run `start-viewer.cmd` to launch the viewer from Windows.

## YAML format

The YAML file uses the following structure:

```yaml
title: "My Building Floorplans"
buildings:
  buildingA:
    label: Building A
    floors:
      - name: Ground Floor
        level: 0
        image: ./images/ground-floor.jpg
      - name: First Floor
        level: 1
        image: ./images/first-floor.jpg
```

### Fields

- `title` - Optional page title shown in the viewer.
- `buildings` - Root object containing each building key.
- `label` - Display name for the building.
- `floors` - Array of floor entries.
- `name` - Floor name shown in the floor selector.
- `level` - Optional numeric floor level.
- `image` - URL or path to the floor plan image.

## Project files

- `index.html` - Viewer page and UI
- `floorplan.js` - Viewer logic and YAML parser
- `floorplan.css` - Viewer styling
- `floorplan.yaml` - Example floorplan configuration
- `start-viewer.cmd` - Windows helper to open the viewer

## Development

1. Modify `floorplan.yaml` with your own buildings, floors, and image URLs.
2. Open `index.html` in a browser.
3. Use the selectors to confirm your floorplan data loads correctly.

## Notes

- Images can be local paths or remote URLs.
- The viewer uses `js-yaml` to parse YAML in the browser.
- The app will report missing or unreachable floorplan images.
