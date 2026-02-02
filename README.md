# Motion Labs

A next-generation browser-based video editor that combines a professional **DaVinci Resolve-style** non-linear editing (NLE) workflow with the power of the web.

Unlike traditional video editors, Motion Labs allows you to mix standard media (video, audio, images) directly with **live React components** and AI-generated elements on the timeline.

## Features

- 🎬 **Pro NLE Interface**: Multi-track timeline with JKL shuttle controls, snapping, and precise layer management inspired by DaVinci Resolve.
- ⚛️ **React on Timeline**: Drop fully functional React components onto the timeline as video layers.
- 🤖 **AI Generation**: Generate custom UI elements or animations on the fly using Generative AI.
- 🎚️ **Advanced Controls**: Keyframe-ready properties, visibility toggles, track locking, and blending modes.
- 🌓 **Themed UI**: Sleek dark/light mode adaptable interface.
- 🚀 **Browser Native**: Built with Vite and React 19 for high-performance client-side rendering.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- @google/genai (for AI-generated asset experiments)

## Getting Started

```bash
npm install
npm run dev
```

Then open the local dev server printed in the terminal.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run preview` — preview the production build

## Project Structure

- `App.tsx` — main editor shell and state management
- `components/` — editor UI, timeline, panels, and preview
- `services/` — API/AI integrations
- `utils/` — helpers and local data utilities
- `constants.ts` / `types.ts` — shared config and types

## Notes

This is a prototype editor UI. Media processing/export may be partial or mocked, depending on the panel implementation.

## License

Add a license if you plan to distribute or open-source this project.
