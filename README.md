# **WIP**

# 3D Home Assistant Dashboard

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/leonida92)

An interactive, 3D dashboard for Home Assistant built with React, Three.js (React Three Fiber), and Tailwind CSS. This project allows you to visualize your home in 3D, interact with Home Assistant entities via customizable pins, and modify materials and lighting in real-time.

## Features

- **3D Model Visualization**: Load and render a 3D model of your home (e.g., GLTF/GLB formats) using Three.js and React Three Fiber.
- **Home Assistant Integration**: Real-time websocket connection to your Home Assistant instance using `home-assistant-js-websocket`.
- **Personalized Views**: Create multiple saved views of your home. Every change you make (including background settings) is saved per view. You can even upload custom thumbnails for each view.
- **Advanced Camera Controls**: Switch between Orthographic, Perspective, and 2-point Perspective cameras. Modify the Field of View (FOV) and lock/unlock orbiting and movement for precise framing.
- **First-Person Navigation**: Walk through your 3D scene using WASD controls, with adjustable walking speed.
- **Interactive Pins**: Place fully customizable pins on meshes and link them to Home Assistant entities. Display any number of entity attributes. Pins automatically hide while orbiting or walking for a cleaner view.
- **Dynamic Entity Reactions**: 
  - **Physical Lights**: Assign a light entity to a mesh to create a real 3D light source in the scene, with controllable intensity, color, and position.
  - **Sensor Highlighting**: Visually highlight meshes based on sensor or binary sensor states (e.g., a door mesh changes to a specific color when the physical door is opened).
- **Tag Management & Visibility**: Tag meshes for organization or visibility control. Isolate specific tagged items to create focused, orthographic views of a single room or space.
- **Lighting & Rendering**:
  - Choose between different HDRIs (or upload your own) to dramatically change the scene's environmental lighting.
  - Toggle between different rendering styles (currently supports a clean white/clay mode).
  - Adjust shadow quality to optimize performance for your specific hardware.
- **Material Editor**: A built-in material editor allows you to quickly adjust colors, metalness, roughness, and opacity of any mesh directly from the UI.
- **Presentation Mode**: Toggle the visibility of the UI interface to enjoy an unobstructed view of your configured dashboard.

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

**Try it instantly:**
You can skip the installation entirely by downloading the latest `index.html` from the [Releases](../../releases) page. Just double-click the file to open it directly in your browser!

**For Developers:**
If you want to run the project locally or modify the code:

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

## Model Preparation

Before using the dashboard, you must prepare your 3D model in a dedicated 3D modeling software (like Blender, Maya, or 3ds Max). 

**Important Considerations:**
- **Mesh Division:** The dashboard does not support merging or dividing meshes. Ensure you separate your home's objects into individual meshes in your 3D software (e.g., separate walls, doors, windows, and furniture) so you can individually assign materials, colors, or Home Assistant entities to them later.
- **Textures:** Set up your UV maps and base textures before exporting. 
- **Export Format:** The dashboard requires a `.glb` or `.gltf` file. If your preferred 3D software does not support exporting directly to GLB/GLTF, you can import your model into [Blender](https://www.blender.org/) (which is free) and export it as a `.glb` from there.

## Configuration & Usage

1. **Connecting to Home Assistant**:
   Open the dashboard in your browser. Use the settings panel (gear icon) to input your Home Assistant URL (e.g., `http://homeassistant.local:8123`) and your Long-Lived Access Token.
2. **Uploading your 3D Model**:
   Load your `.glb` or `.gltf` home model into the viewer.
3. **Placing Pins**:
   Navigate around your 3D home. Add a new pin, place it on a specific location (e.g., a lamp), and link it to the corresponding Home Assistant entity ID.
4. **Editing Materials**:
   Use the material picker mode to click on a wall, floor, or object in your 3D model. Use the Material Editor panel to adjust colors, textures, and properties.

## Integrating into Home Assistant

The best way to use this dashboard is directly inside your Home Assistant instance. Since the dashboard compiles into a single file, it's very easy to embed!

1. **Host the File:**
   - Download the `index.html` file from the latest release.
   - Place this file inside your Home Assistant's `www` folder (create the folder in your `config` directory if it doesn't exist).
2. **Add the Card:**
   - Open your Home Assistant dashboard.
   - Click the pencil icon in the top right to **Edit Dashboard**.
   - Click **Add Card** and search for the **Webpage** card.
   - In the URL field, type: `/local/index.html`
   - Adjust the aspect ratio as desired (e.g., `100%`) and save!

## Project Structure

- `src/components/`: UI components, 3D scene elements, editors, and overlays.
- `src/ha/`: Home Assistant connection logic.
- `src/store/`: Zustand state management (slices for camera, config, entities, meshes, and rendering).
- `src/utils/`: Helper utilities and colors.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the [LICENSE](LICENSE) file for details. This ensures the project and all its derivative works will always remain free and open-source.
