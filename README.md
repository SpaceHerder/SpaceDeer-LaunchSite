# SpaceHerd: Satellite Intelligence for Arctic Herds

![SpaceHerd](satelitt.jpg)

**SpaceHerd** is an advanced satellite telemetry and landscape intelligence platform designed for modern herd management in the Arctic. By leveraging Earth observation data (Copernicus / Sentinel) and predictive analytics, SpaceHerd provides herders with real-time herd tracking, forage quality assessment, and movement predictions without requiring physical collars on every animal.

SpaceHerd sells two separate products. Both work from Earth-observation imagery, but each is its own tool:

| Product | For | Focus |
| --- | --- | --- |
| **SpaceDeer** | Reindeer husbandry | Seasonal migration corridors, lichen availability and snow-crust risk, 48-hour trajectory forecasts |
| **SpaceSheep** | Free-range sheep farming | Summer rangeland coverage, autumn round-up planning, grazing pressure and vegetation recovery per pasture unit |

---

## Key Features

- **Hardware-Free Herd Monitoring**: High-resolution satellite landscape intelligence that eliminates the need for expensive physical GPS collars or bells on every animal.
- **Predictive Trajectory Routing**: Combines historical Arctic migration and grazing patterns with real-time terrain data to anticipate herd movement.
- **Actionable Earth Observation**: Daily vegetation (NDVI) and snow-cover analysis. Lichen beneath the winter crust for reindeer, summer rangeland recovery for sheep.
- **Interactive Telemetry Dashboard**: Rich visual experience powered by dynamic HTML5 Canvas herd simulations and GSAP interactive animations.

---

## Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism & Dark Mode Design System)
- **Animations & Graphics**: HTML5 Canvas (`reindeer-bg.js`, `particles.js`), GSAP 3 (ScrollTrigger)
- **Geospatial & Telemetry**: Earth Observation data analysis (`telemetry.js`, `map.js`)

---

## 📁 Project Structure

```
├── index.html          # Main landing page
├── style.css           # Custom CSS variables, responsive grid, and glassmorphism styling
├── main.js             # UI interactions, navigation, and scroll animation hooks
├── reindeer-bg.js      # Interactive canvas herd simulation engine (reindeer & sheep)
├── particles.js        # Dynamic background & telemetry particle systems
├── telemetry.js        # Orbital telemetry & satellite signal calculations
├── map.js              # Geospatial map visualizers & layer controls
├── reinsdyr.jpg        # Hero imagery
├── satelitt.jpg        # Satellite imagery asset
├── nvdi.png            # Vegetation index visualization asset
└── nord-norge-sat.jpg  # Earth observation satellite overview asset
```

---

## Contact & Organization

- **Location**: Tromsø, Norway
- **Copyright**: © 2026 SpaceHerd. All rights reserved.
