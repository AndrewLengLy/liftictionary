import { useEffect, useState } from 'react';
import { getExercise, getRelated } from '../api';
import { hrefFor } from '../links';
import ExerciseCard from './ExerciseCard';
import ExerciseGif from './ExerciseGif';

export default function ExerciseDetail({ id, onBack, onOpen, onPart }) {
  const [exercise, setExercise] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setExercise(null);
    setRelated([]);
    setError('');
    getExercise(id, ctrl.signal)
      .then((ex) => {
        setExercise(ex);
        document.title = `${ex.name} | Liftictionary`;
        return getRelated(ex, ctrl.signal).then(setRelated).catch(() => {});
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Something went wrong.');
      });
    return () => {
      ctrl.abort();
      document.title = 'Liftictionary';
    };
  }, [id, retryKey]);

  if (error) {
    return (
      <div className="detail">
        <BackLink onBack={onBack} />
        <div className="notice" role="alert">
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => setRetryKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="detail" aria-busy="true">
        <BackLink onBack={onBack} />
        <div className="entry skeleton">
          <span className="bar tall" />
          <span className="bar short" />
        </div>
      </div>
    );
  }

  const { name, gifUrl, bodyParts, equipments, targetMuscles, secondaryMuscles, instructions } = exercise;

  return (
    <article className="detail">
      <BackLink onBack={onBack} />
      <div className="entry">
        <div className="entry-text">
          <h1 className="entry-name">{name}</h1>
          <p className="entry-pron">
            <span>/</span>
            {bodyParts.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                <button type="button" className="inline-link" onClick={() => onPart(p)}>
                  {p}
                </button>
              </span>
            ))}
            {equipments.length > 0 && <span> · {equipments.join(', ')}</span>}
            <span>/</span>
          </p>

          <dl className="muscles">
            <div>
              <dt>Targets</dt>
              <dd>{targetMuscles.join(', ') || 'Not listed'}</dd>
            </div>
            {secondaryMuscles.length > 0 && (
              <div>
                <dt>Also works</dt>
                <dd>{secondaryMuscles.join(', ')}</dd>
              </div>
            )}
          </dl>

          {instructions.length > 0 && (
            <>
              <h2 className="entry-sub">How to do it</h2>
              <ol className="steps">
                {instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </>
          )}
        </div>
        <figure className="entry-media">
          <ExerciseGif src={gifUrl} alt={`Animated demo of ${name}`} eager />
        </figure>
      </div>

      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <h2 id="related-title" className="entry-sub">
            More for the {targetMuscles[0]}
          </h2>
          <ul className="grid">
            {related.map((ex) => (
              <li key={ex.id}>
                <ExerciseCard exercise={ex} href={hrefFor(ex.id)} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function BackLink({ onBack }) {
  return (
    <button type="button" className="back" onClick={onBack}>
      ← All exercises
    </button>
  );
}
