# **WIP**

# 3D Home Assistant Dashboard

An interactive, 3D dashboard for Home Assistant built with React, Three.js (React Three Fiber), and Tailwind CSS. This project allows you to visualize your home in 3D, interact with Home Assistant entities via customizable pins, and modify materials and lighting in real-time.

## Features

- **3D Model Visualization**: Load and render a 3D model of your home (e.g., GLTF/GLB formats) using Three.js and React Three Fiber.
- **Home Assistant Integration**: Real-time websocket connection to your Home Assistant instance using `home-assistant-js-websocket`.
- **Interactive Pins**: 
  - Place custom pins on the 3D model.
  - Bind pins to Home Assistant entities (e.g., lights, switches, sensors).
  - Interact with pins to toggle entities or display real-time state.
  - Customize pin appearance (colors, icons, styles).
- **Material Editor**: Select meshes on your 3D model and dynamically edit their materials (color, metalness, roughness, opacity, etc.) directly from the UI.
- **Lighting Controls**: Adjust the scene's lighting (ambient light, directional light, intensity) to match real-world conditions or aesthetics.
- **Mesh & Tag Management**: Easily list, hide, or show specific parts (meshes) of your 3D model. Organize meshes with tags for easier management.
- **Settings & State Persistence**: Customize your connection settings, theme, and save your camera views and pin configurations. State is managed seamlessly via Zustand.

## Tech Stack

- **Framework**: React 19, Vite
- **3D Rendering**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **State Management**: Zustand
- **Home Assistant**: `home-assistant-js-websocket`
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Home Assistant instance accessible via network with a Long-Lived Access Token.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Configuration & Usage

1. **Connecting to Home Assistant**:
   Open the dashboard in your browser. Use the settings panel (gear icon) to input your Home Assistant URL (e.g., `http://homeassistant.local:8123`) and your Long-Lived Access Token.
2. **Uploading your 3D Model**:
   Load your `.glb` or `.gltf` home model into the viewer.
3. **Placing Pins**:
   Navigate around your 3D home. Add a new pin, place it on a specific location (e.g., a lamp), and link it to the corresponding Home Assistant entity ID.
4. **Editing Materials**:
   Use the material picker mode to click on a wall, floor, or object in your 3D model. Use the Material Editor panel to adjust colors, textures, and properties.

## Project Structure

- `src/components/`: UI components, 3D scene elements, editors, and overlays.
- `src/ha/`: Home Assistant connection logic.
- `src/store/`: Zustand state management (slices for camera, config, entities, meshes, and rendering).
- `src/utils/`: Helper utilities and colors.
