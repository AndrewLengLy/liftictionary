import { useState } from 'react';

export default function ExerciseGif({ src, alt, eager = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="gif-missing" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <span>No demo</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width="360"
      height="360"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
