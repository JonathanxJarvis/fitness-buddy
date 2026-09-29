import type { Exercise, Muscle } from './types';
import { findExercise } from './training';

/** Muscles as drawn on the body map (front and back). */
export type MuscleRegion =
  | 'chest' | 'front-delts' | 'side-delts' | 'rear-delts' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'traps' | 'lats' | 'upper-back' | 'lower-back'
  | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'abductors' | 'calves';

export const REGION_LABEL: Record<MuscleRegion, string> = {
  chest: 'Chest', 'front-delts': 'Front delts', 'side-delts': 'Side delts', 'rear-delts': 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
  traps: 'Traps', lats: 'Lats', 'upper-back': 'Upper back', 'lower-back': 'Lower back',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', adductors: 'Adductors', abductors: 'Abductors', calves: 'Calves',
};

export interface ExerciseInfo {
  primary: MuscleRegion[];
  secondary: MuscleRegion[];
  /** Short form cues in our own words, 2–4 lines. */
  cues: string[];
}

type R = MuscleRegion;
const info = (primary: R[], secondary: R[], cues: string[]): ExerciseInfo => ({ primary, secondary, cues });

/** Muscles and form cues for every exercise in the library. */
export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  // chest
  'bench-press': info(['chest'], ['front-delts', 'triceps'], [
    'Squeeze your shoulder blades together and keep them there',
    'Lower the bar to the middle of your chest with control',
    'Feet flat, drive the bar up and slightly back over your shoulders',
  ]),
  'incline-bench': info(['chest', 'front-delts'], ['triceps'], [
    'Set the bench to a low incline, around 30 degrees',
    'Bring the bar down to your upper chest, just under the collarbone',
    'Keep your wrists stacked right over your elbows',
  ]),
  'db-bench': info(['chest'], ['front-delts', 'triceps'], [
    'Let the dumbbells sink until they line up with your chest',
    'Press up and slightly together, without clanking them',
    'Keep your shoulders pulled down away from your ears',
  ]),
  'incline-db-press': info(['chest', 'front-delts'], ['triceps'], [
    'Low incline, back and head resting on the bench',
    'Lower the weights to the sides of your upper chest',
    'Press up in a slight arc so they meet above your eyes',
  ]),
  'db-fly': info(['chest'], ['front-delts'], [
    'Keep a soft, fixed bend in your elbows the whole time',
    'Open your arms wide until you feel a stretch across the chest',
    'Bring them back up like you are hugging a big barrel',
  ]),
  'cable-fly': info(['chest'], ['front-delts'], [
    'Take a small step forward and lean in a little',
    'Sweep your hands together in a wide arc',
    'Hold the squeeze for a beat, then let them back slowly',
  ]),
  'chest-press': info(['chest'], ['front-delts', 'triceps'], [
    'Set the seat so the handles sit at mid-chest height',
    'Push out smoothly without slamming your elbows straight',
    'Keep your back and head against the pad',
  ]),
  'pec-deck': info(['chest'], ['front-delts'], [
    'Sit tall with your elbows just under shoulder height',
    'Bring the pads together and squeeze your chest',
    'Let them open slowly, stopping before your shoulders strain',
  ]),
  'push-up': info(['chest', 'triceps'], ['front-delts', 'abs'], [
    'Hold your body in one straight line from head to heels',
    'Hands a little wider than your shoulders',
    'Lower until your chest is a fist from the floor, then push away',
  ]),
  dip: info(['chest', 'triceps'], ['front-delts'], [
    'Lean slightly forward to bring the chest in more',
    'Lower until your upper arms are about level with the floor',
    'Keep your shoulders down, away from your ears',
  ]),
  // back
  deadlift: info(['glutes', 'hamstrings', 'lower-back'], ['quads', 'traps', 'forearms', 'lats'], [
    'Start with the bar over the middle of your foot, close to your shins',
    'Brace your stomach and keep your back flat',
    'Push the floor away so hips and chest rise together',
    'Finish standing tall, without leaning back',
  ]),
  'barbell-row': info(['lats', 'upper-back'], ['rear-delts', 'biceps', 'lower-back'], [
    'Hinge forward to about 45 degrees with a flat back',
    'Pull the bar toward your lower ribs',
    'Lead with your elbows and lower it under control',
  ]),
  'db-row': info(['lats', 'upper-back'], ['rear-delts', 'biceps'], [
    'Knee and hand on the bench, back flat like a table',
    'Row the dumbbell up toward your hip',
    'Keep your chest square to the floor, no twisting',
  ]),
  'pull-up': info(['lats'], ['upper-back', 'biceps', 'rear-delts', 'forearms'], [
    'Start from a full hang with your shoulders engaged',
    'Drive your elbows down toward your ribs',
    'Get your chin over the bar without kicking or swinging',
  ]),
  'chin-up': info(['lats', 'biceps'], ['upper-back', 'forearms'], [
    'Palms facing you, hands about shoulder width',
    'Pull your chest toward the bar',
    'Lower all the way down with control',
  ]),
  'lat-pulldown': info(['lats'], ['biceps', 'upper-back', 'rear-delts'], [
    'Lock your thighs under the pad',
    'Pull the bar to your upper chest, leaning back just a little',
    'Let it rise slowly until your arms are straight',
  ]),
  'seated-row': info(['upper-back', 'lats'], ['biceps', 'rear-delts'], [
    'Sit tall with a slight bend in your knees',
    'Pull the handle to your belly button',
    'Squeeze your shoulder blades together, then reach forward',
  ]),
  't-bar-row': info(['upper-back', 'lats'], ['rear-delts', 'biceps', 'lower-back'], [
    'Hinge over the bar with your chest up and back flat',
    'Pull the handles toward your stomach',
    'Pause at the top, then lower without rounding',
  ]),
  'face-pull': info(['rear-delts'], ['upper-back', 'traps'], [
    'Set the rope at about face height',
    'Pull toward your forehead with elbows high and wide',
    'Finish with your hands beside your ears',
  ]),
  'back-extension': info(['lower-back'], ['glutes', 'hamstrings'], [
    'Set the pad just below your hip bones',
    'Lower down with a long, flat back',
    'Rise until your body forms a straight line, not past it',
  ]),
  // shoulders
  ohp: info(['front-delts'], ['side-delts', 'triceps', 'traps'], [
    'Squeeze your glutes and keep your ribs tucked down',
    'Press straight up, moving your head back out of the way',
    'Finish with the bar over the middle of your foot',
  ]),
  'db-shoulder-press': info(['front-delts'], ['side-delts', 'triceps'], [
    'Start with the dumbbells at ear height',
    'Press up until your arms are nearly straight',
    'Keep your lower back against the bench',
  ]),
  'lateral-raise': info(['side-delts'], ['traps'], [
    'Stand tall with a small bend in your elbows',
    'Raise your arms out to the sides up to shoulder height',
    'Lower slowly, no swinging or shrugging',
  ]),
  'cable-lateral': info(['side-delts'], ['traps'], [
    'Stand side-on to the low pulley, handle in the far hand',
    'Sweep your arm out and up to shoulder height',
    'Keep the tension on all the way down',
  ]),
  'rear-delt-fly': info(['rear-delts'], ['upper-back'], [
    'Hinge forward with a flat back and soft elbows',
    'Open your arms out to the sides',
    'Think of pushing the weights wide, not squeezing your back',
  ]),
  'arnold-press': info(['front-delts', 'side-delts'], ['triceps'], [
    'Start with palms facing you at chin height',
    'Rotate your palms forward as you press up',
    'Reverse the turn on the way down',
  ]),
  'upright-row': info(['side-delts', 'traps'], ['front-delts', 'biceps'], [
    'Hold the bar about shoulder width',
    'Lift with your elbows leading, out to the sides',
    'Stop around chest height, where it still feels comfortable',
  ]),
  shrug: info(['traps'], ['forearms'], [
    'Stand tall with the weights at your sides',
    'Lift your shoulders straight up toward your ears',
    'Pause at the top, then lower all the way',
  ]),
  // arms
  'barbell-curl': info(['biceps'], ['forearms'], [
    'Keep your elbows pinned at your sides',
    'Curl the bar up without leaning back',
    'Lower it all the way down slowly',
  ]),
  'db-curl': info(['biceps'], ['forearms'], [
    'Elbows stay close to your body',
    'Turn your palms up as you curl',
    'Squeeze at the top and lower under control',
  ]),
  'hammer-curl': info(['biceps', 'forearms'], [], [
    'Palms face each other the whole time',
    'Curl up without swinging your upper arm',
    'Lower slowly to a full stretch',
  ]),
  'preacher-curl': info(['biceps'], ['forearms'], [
    'Rest the back of your upper arms flat on the pad',
    'Curl up until your forearms are nearly vertical',
    'Go slow at the bottom, where it is hardest',
  ]),
  'cable-curl': info(['biceps'], ['forearms'], [
    'Stand close to the low pulley, elbows at your sides',
    'Curl the handle up toward your shoulders',
    'Keep the cable tight all the way down',
  ]),
  'tricep-pushdown': info(['triceps'], [], [
    'Elbows tucked in at your sides and kept still',
    'Push down until your arms are straight',
    'Let it rise only until your forearms are level',
  ]),
  'overhead-extension': info(['triceps'], [], [
    'Hold the dumbbell overhead with both hands',
    'Lower it behind your head, elbows pointing up',
    'Straighten your arms without flaring the elbows',
  ]),
  'skull-crusher': info(['triceps'], [], [
    'Upper arms point straight up and stay there',
    'Bend at the elbows to bring the bar toward your forehead',
    'Straighten your arms to lift it back up',
  ]),
  'close-grip-bench': info(['triceps', 'chest'], ['front-delts'], [
    'Hands about shoulder width on the bar',
    'Keep your elbows tucked close as you lower',
    'Touch low on the chest and press back up',
  ]),
  // legs & glutes
  squat: info(['quads', 'glutes'], ['adductors', 'hamstrings', 'lower-back'], [
    'Bar sits on your upper back, not your neck',
    'Brace, then sit down between your hips',
    'Knees follow the direction of your toes',
    'Drive up through your whole foot',
  ]),
  'front-squat': info(['quads'], ['glutes', 'abs', 'upper-back'], [
    'Bar rests on the front of your shoulders, elbows high',
    'Stay tall and sit straight down',
    'Keep your elbows up as you stand',
  ]),
  'leg-press': info(['quads', 'glutes'], ['adductors', 'hamstrings'], [
    'Feet about shoulder width in the middle of the platform',
    'Lower until your knees are near your chest, back stays flat',
    'Push through your heels without locking your knees',
  ]),
  'hack-squat': info(['quads'], ['glutes'], [
    'Back flat against the pad, feet shoulder width',
    'Sink down as deep as you can with control',
    'Drive up through the middle of your feet',
  ]),
  'goblet-squat': info(['quads', 'glutes'], ['abs', 'adductors'], [
    'Hold the weight close to your chest',
    'Sit down between your heels, chest up',
    'Push your knees out as you rise',
  ]),
  'bulgarian-split-squat': info(['quads', 'glutes'], ['adductors', 'hamstrings'], [
    'Rear foot on a bench, front foot well forward',
    'Drop your back knee straight down',
    'Push through the front heel to stand',
  ]),
  lunge: info(['quads', 'glutes'], ['adductors', 'hamstrings', 'calves'], [
    'Take a long step and keep your torso upright',
    'Lower until your back knee nearly touches the floor',
    'Push off the front foot into the next step',
  ]),
  'leg-extension': info(['quads'], [], [
    'Line your knees up with the machine pivot',
    'Straighten your legs and squeeze at the top',
    'Lower slowly instead of letting it drop',
  ]),
  'leg-curl': info(['hamstrings'], ['calves'], [
    'Pad sits just above your heels',
    'Curl your heels toward your glutes',
    'Keep your hips pressed into the pad',
  ]),
  rdl: info(['hamstrings', 'glutes'], ['lower-back', 'forearms'], [
    'Soft knees, then push your hips back',
    'Slide the bar down your thighs, back stays flat',
    'Stop at a deep hamstring stretch and stand back up',
  ]),
  'calf-raise': info(['calves'], [], [
    'Balls of your feet on the edge, heels free',
    'Rise as high as you can onto your toes',
    'Lower into a full stretch below the step',
  ]),
  'hip-thrust': info(['glutes'], ['hamstrings', 'quads'], [
    'Upper back on the bench, bar over your hips',
    'Drive through your heels to lift your hips',
    'Finish with shins vertical and chin tucked',
  ]),
  'glute-bridge': info(['glutes'], ['hamstrings'], [
    'Lie on your back, feet flat near your hips',
    'Press your hips up into a straight line',
    'Squeeze your glutes hard at the top',
  ]),
  'cable-kickback': info(['glutes'], ['hamstrings'], [
    'Strap on the ankle cuff and hold the frame',
    'Kick your leg back and slightly up',
    'Move from the hip, not by arching your back',
  ]),
  'hip-abduction': info(['abductors'], ['glutes'], [
    'Sit back with the pads on the outside of your knees',
    'Push your knees out as wide as you can',
    'Bring them back slowly, keeping some tension',
  ]),
  // core
  plank: info(['abs'], ['obliques', 'front-delts'], [
    'Elbows under shoulders, body in a straight line',
    'Tuck your hips slightly and squeeze your glutes',
    'Breathe steadily and hold still',
  ]),
  crunch: info(['abs'], ['obliques'], [
    'Knees bent, feet flat on the floor',
    'Curl your shoulders up off the floor',
    'Lead with your chest, not by pulling your neck',
  ]),
  'hanging-leg-raise': info(['abs'], ['obliques', 'forearms'], [
    'Hang still with your shoulders engaged',
    'Lift your legs by curling your hips up',
    'Lower slowly without swinging',
  ]),
  'cable-crunch': info(['abs'], ['obliques'], [
    'Kneel below the pulley, rope beside your head',
    'Curl your ribs down toward your hips',
    'Keep your hips still while you crunch',
  ]),
  'russian-twist': info(['obliques'], ['abs'], [
    'Lean back a little with your chest up',
    'Turn your shoulders from side to side',
    'Move slowly and follow your hands with your eyes',
  ]),
  'ab-wheel': info(['abs'], ['lats', 'obliques'], [
    'Start kneeling with the wheel under your shoulders',
    'Roll out while keeping your lower back from sagging',
    'Pull back in using your stomach, not your hips',
  ]),
  // full body / conditioning
  'kb-swing': info(['glutes', 'hamstrings'], ['lower-back', 'quads', 'forearms'], [
    'Hike the bell back between your legs',
    'Snap your hips forward to float it up',
    'Let your arms stay loose, like ropes',
  ]),
  clean: info(['quads', 'glutes', 'hamstrings', 'traps'], ['lower-back', 'upper-back', 'calves', 'forearms'], [
    'Start like a deadlift, bar close to your shins',
    'Jump the bar up by snapping your hips open',
    'Pull yourself under and catch it on your shoulders',
  ]),
  burpee: info(['quads', 'chest', 'glutes'], ['triceps', 'abs', 'front-delts', 'calves'], [
    'Squat down and place your hands on the floor',
    'Jump your feet back to a plank, then back in',
    'Stand up and jump with your arms overhead',
  ]),
  'farmer-carry': info(['forearms', 'traps'], ['abs', 'obliques', 'glutes', 'calves'], [
    'Pick up heavy weights and stand tall',
    'Walk with short, steady steps',
    'Keep your shoulders back and grip tight',
  ]),
};

/** What a custom exercise works when all we know is its muscle group. */
const GROUP_INFO: Record<Muscle, ExerciseInfo> = {
  chest: info(['chest'], ['front-delts', 'triceps'], ['Keep your shoulders down and back', 'Control the weight on the way down']),
  back: info(['lats', 'upper-back'], ['biceps', 'rear-delts'], ['Lead each pull with your elbows', 'Squeeze your shoulder blades at the end']),
  shoulders: info(['front-delts', 'side-delts'], ['triceps', 'traps'], ['Keep your ribs down and core tight', 'Move smoothly, no swinging']),
  arms: info(['biceps', 'triceps'], ['forearms'], ['Keep your elbows still', 'Use a full range of motion']),
  legs: info(['quads', 'hamstrings'], ['glutes', 'calves'], ['Knees track over your toes', 'Push through your whole foot']),
  glutes: info(['glutes'], ['hamstrings'], ['Drive from your hips', 'Squeeze hard at the top']),
  core: info(['abs'], ['obliques'], ['Brace like you are about to be poked', 'Breathe out as you work']),
  cardio: info(['quads', 'calves'], ['hamstrings', 'glutes'], ['Start easy and build up', 'Keep a pace you can breathe through']),
  full: info(['quads', 'glutes'], ['chest', 'lats', 'abs', 'front-delts'], ['Brace your core before each rep', 'Stay smooth rather than rushed']),
};

/**
 * Name patterns that tell us a custom exercise is really a variation of a
 * library one ("Incline hammer curl" → hammer curl). First match wins, so the
 * specific ones come first.
 */
const NAME_HINTS: [RegExp, string][] = [
  [/romanian|\brdl\b|stiff/i, 'rdl'],
  [/deadlift/i, 'deadlift'],
  [/hip thrust/i, 'hip-thrust'],
  [/bridge/i, 'glute-bridge'],
  [/kickback|kick back|donkey/i, 'cable-kickback'],
  [/abduct/i, 'hip-abduction'],
  [/front squat/i, 'front-squat'],
  [/hack/i, 'hack-squat'],
  [/goblet/i, 'goblet-squat'],
  [/split squat|bulgarian/i, 'bulgarian-split-squat'],
  [/lunge|step.?up/i, 'lunge'],
  [/leg press/i, 'leg-press'],
  [/squat/i, 'squat'],
  [/leg ext/i, 'leg-extension'],
  [/leg curl|hamstring curl|nordic/i, 'leg-curl'],
  [/calf/i, 'calf-raise'],
  [/hammer/i, 'hammer-curl'],
  [/preacher/i, 'preacher-curl'],
  [/cable.*curl/i, 'cable-curl'],
  [/barbell.*curl|ez.*curl/i, 'barbell-curl'],
  [/curl/i, 'db-curl'],
  [/pushdown|push down|pressdown/i, 'tricep-pushdown'],
  [/skull/i, 'skull-crusher'],
  [/overhead.*ext|tricep.*ext|french/i, 'overhead-extension'],
  [/close.?grip/i, 'close-grip-bench'],
  [/back ext|hyperext|good ?morning/i, 'back-extension'],
  [/face pull/i, 'face-pull'],
  [/rear delt|reverse fly|reverse pec/i, 'rear-delt-fly'],
  [/cable.*(lateral|side)/i, 'cable-lateral'],
  [/lateral|side raise|front raise/i, 'lateral-raise'],
  [/upright/i, 'upright-row'],
  [/shrug/i, 'shrug'],
  [/arnold/i, 'arnold-press'],
  [/pec deck|butterfly|machine fly/i, 'pec-deck'],
  [/cable.*(fly|crossover)|crossover/i, 'cable-fly'],
  [/fly/i, 'db-fly'],
  [/incline.*(db|dumbbell)/i, 'incline-db-press'],
  [/incline/i, 'incline-bench'],
  [/(db|dumbbell).*bench|(db|dumbbell) press/i, 'db-bench'],
  [/chest press/i, 'chest-press'],
  [/bench/i, 'bench-press'],
  [/overhead|shoulder press|military|\bohp\b|push press/i, 'ohp'],
  [/push.?up|press.?up/i, 'push-up'],
  [/\bdips?\b/i, 'dip'],
  [/chin.?up/i, 'chin-up'],
  [/pull.?up|muscle.?up/i, 'pull-up'],
  [/pulldown|pull down/i, 'lat-pulldown'],
  [/t.?bar/i, 't-bar-row'],
  [/seated.*row|cable row|rowing machine/i, 'seated-row'],
  [/(one.?arm|single.?arm|db|dumbbell).*row/i, 'db-row'],
  [/row/i, 'barbell-row'],
  [/hanging|leg raise|knee raise|toes to bar/i, 'hanging-leg-raise'],
  [/plank|hollow/i, 'plank'],
  [/cable crunch/i, 'cable-crunch'],
  [/crunch|sit.?up/i, 'crunch'],
  [/twist|woodchop|wood chop/i, 'russian-twist'],
  [/rollout|ab wheel/i, 'ab-wheel'],
  [/swing/i, 'kb-swing'],
  [/clean|snatch|jerk/i, 'clean'],
  [/burpee/i, 'burpee'],
  [/carry|farmer/i, 'farmer-carry'],
];

/**
 * The library exercise a custom exercise is a variation of, when its name
 * says so. Cardio entries are left alone ("Rowing" is not a barbell row).
 */
export function libraryMatch(ex: Pick<Exercise, 'name' | 'muscle'>): string | undefined {
  if (ex.muscle === 'cardio') return undefined;
  return NAME_HINTS.find(([re]) => re.test(ex.name))?.[1];
}

/** Primary and secondary muscles plus short form cues for any exercise id. */
export function exerciseInfo(exerciseId: string, customExercises: Exercise[] = []): ExerciseInfo {
  const known = EXERCISE_INFO[exerciseId];
  if (known) return known;
  const ex = findExercise(exerciseId, customExercises);
  if (!ex) return { primary: [], secondary: [], cues: [] };
  const match = libraryMatch(ex);
  if (match) return EXERCISE_INFO[match];
  return GROUP_INFO[ex.muscle] ?? GROUP_INFO.full;
}

/**
 * Muscles worked across several exercises. A muscle that is primary in any of
 * them counts as primary; secondary lists only the rest. Order follows first
 * appearance.
 */
export function workoutMuscles(exerciseIds: string[], customExercises: Exercise[] = []): { primary: MuscleRegion[]; secondary: MuscleRegion[] } {
  const primary: MuscleRegion[] = [];
  const secondary: MuscleRegion[] = [];
  const infos = exerciseIds.map((id) => exerciseInfo(id, customExercises));
  for (const i of infos) for (const m of i.primary) if (!primary.includes(m)) primary.push(m);
  for (const i of infos) for (const m of i.secondary) if (!primary.includes(m) && !secondary.includes(m)) secondary.push(m);
  return { primary, secondary };
}
