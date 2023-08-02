type Note = `${'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'}${'b' | '#' | ''}${number}`;

function noteToFreq(note: Note): number {
  const baseFreqs: any = {
    A: 55,
    'A#': 58.27,
    Bb: 58.27,
    B: 61.74,
    C: 65.41,
    'C#': 69.3,
    Db: 69.3,
    D: 73.42,
    'D#': 77.78,
    Eb: 77.78,
    E: 82.41,
    F: 87.31,
    'F#': 92.5,
    Gb: 92.5,
    G: 98.0,
    'G#': 103.83,
    Ab: 103.83,
  };

  const entry = note.match(/#|b/) ? note.slice(0, 2) : note[0];
  const initFreq = baseFreqs[entry];
  const octave = parseInt(note.slice(-1));

  return initFreq * 2 ** octave;
}

export function beep(freq: Note | number, millis?: number) {
  var context = new AudioContext();
  var oscillator = context.createOscillator();
  oscillator.type = 'sine';

  if (typeof freq == 'number') oscillator.frequency.value = freq;
  else oscillator.frequency.value = noteToFreq(freq);

  oscillator.connect(context.destination);
  oscillator.start();

  if (millis != undefined) setTimeout(() => oscillator.stop(), millis);

  return oscillator;
}
