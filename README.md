# Liftictionary

A searchable exercise dictionary built with React on the free [ExerciseDB](https://github.com/ExerciseDB/exercisedb-api) V1 API. Every lift gets a dictionary-style entry with an animated demo, the muscles it works and numbered form cues.

## Features

- Fuzzy search across 1,500 exercises
- Body part filters that combine with search
- Exercise entries with target and secondary muscles, step-by-step instructions and related lifts for the same muscle
- Shareable URLs (`?q=`, `?part=`, `?id=`) with working back and forward buttons
- Paged results, loading skeletons, retry on API errors

## Run it

```bash
npm install
npm start      # http://localhost:3000
npm test
npm run build
```

No API key is needed. The app calls `https://oss.exercisedb.dev/api/v1` directly. All API code lives in `src/api.js`.

## Deploy

The production build in `build/` is a static site. On Vercel, import the repo and keep the Create React App defaults.
