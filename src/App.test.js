import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { clearCache, normalizeExercise } from './api';

const benchPress = {
  exerciseId: 'EIeI8Vf',
  name: 'barbell bench press',
  gifUrl: 'https://static.exercisedb.dev/media/EIeI8Vf.gif',
  targetMuscles: ['pectorals'],
  bodyParts: ['chest'],
  equipments: ['barbell'],
  secondaryMuscles: ['triceps', 'shoulders'],
  instructions: ['Step:1 Lie flat on the bench.', 'Step:2 Lower the bar to your chest.'],
};
const pushUp = { ...benchPress, exerciseId: 'push01', name: 'push-up', equipments: ['body weight'] };

const list = (data) => ({
  success: true,
  metadata: { totalExercises: data.length, totalPages: 1, currentPage: 1, previousPage: null, nextPage: null },
  data,
});

function mockApi() {
  global.fetch = jest.fn((url) => {
    const u = new URL(url);
    let body;
    if (u.pathname.endsWith('/bodyparts')) body = { success: true, data: [{ name: 'chest' }, { name: 'back' }] };
    else if (u.pathname.endsWith('/exercises/search')) body = list([pushUp]);
    else if (u.pathname.endsWith('/exercises/filter')) body = list([benchPress, pushUp]);
    else if (u.pathname.endsWith(`/exercises/${benchPress.exerciseId}`)) body = { success: true, data: benchPress };
    else body = list([benchPress, pushUp]);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
}

beforeEach(() => {
  clearCache();
  window.history.replaceState(null, '', '/');
  mockApi();
});

test('lists exercises from ExerciseDB', async () => {
  render(<App />);
  expect(await screen.findByText('barbell bench press')).toBeInTheDocument();
  expect(screen.getByText('push-up')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'chest' })).toBeInTheDocument();
});

test('search calls the fuzzy search endpoint and updates the URL', async () => {
  render(<App />);
  await screen.findByText('barbell bench press');
  await userEvent.type(screen.getByLabelText('Search exercises'), 'push');
  expect(await screen.findByRole('heading', { name: '“push”' })).toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([u]) => u.includes('/exercises/search?') && u.includes('q=push'))).toBe(true);
  expect(window.location.search).toBe('?q=push');
});

test('opening an exercise shows its dictionary entry', async () => {
  render(<App />);
  await userEvent.click(await screen.findByText('barbell bench press'));
  const heading = await screen.findByRole('heading', { level: 1, name: 'barbell bench press' });
  const entry = heading.closest('article');
  expect(within(entry).getByText('Lie flat on the bench.')).toBeInTheDocument();
  expect(within(entry).getByText('triceps, shoulders')).toBeInTheDocument();
  expect(window.location.search).toBe('?id=EIeI8Vf');
});

test('shows a retry message when the API fails', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('ExerciseDB returned an error (500).');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

test('normalizes the older RapidAPI exercise shape', () => {
  const ex = normalizeExercise({ id: '0001', name: 'sit-up', bodyPart: 'waist', equipment: 'body weight', target: 'abs', gifUrl: 'x.gif', instructions: ['Sit up.'] });
  expect(ex).toMatchObject({ id: '0001', bodyParts: ['waist'], equipments: ['body weight'], targetMuscles: ['abs'] });
});
