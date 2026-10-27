# ragnarokTools

A collection of focused tools for Ragnarok Online players. The first tool is a
browser-based MVP respawn timer.

## MVP timer

- Search MVPs by name or map
- Log a kill for a specific spawn location
- Follow the minimum and maximum respawn window live
- Hide MVPs from your personal pool (saved on this device)
- Persist timers locally between sessions
- Receive optional browser notifications
- Use the responsive interface on desktop or mobile

## Local development

```bash
npm install
npm run dev
```

## Refreshing game data

Monster data is stored as static JSON so the Divine Pride API key is never
exposed in the browser. Get an API key from your Divine Pride profile, then run:

```bash
DIVINE_PRIDE_API_KEY=your-key DIVINE_PRIDE_SERVER=iRO npm run data:refresh
```

The script performs requests sequentially with a 1.1-second delay, filters out
MVPs without timed spawn locations, and rewrites `src/data/mvp-data.json`.

## Deployment

Pushes to `main` are deployed to GitHub Pages by the workflow in
`.github/workflows/deploy.yml`.
