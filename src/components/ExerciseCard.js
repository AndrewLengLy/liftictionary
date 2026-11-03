import ExerciseGif from './ExerciseGif';

export default function ExerciseCard({ exercise, href, onOpen }) {
  const meta = [exercise.targetMuscles[0], exercise.equipments[0]].filter(Boolean).join(' / ');
  return (
    <a
      className="card"
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOpen(exercise.id);
      }}
    >
      <div className="card-media">
        <ExerciseGif src={exercise.gifUrl} alt="" />
      </div>
      <div className="card-body">
        <h2 className="card-title">{exercise.name}</h2>
        {meta && <p className="card-meta">{meta}</p>}
      </div>
    </a>
  );
}
