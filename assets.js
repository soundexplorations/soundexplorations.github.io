// Image Assets (key, filepath)
export const images = {
    '16th': 'images/16th.png',
    '8th': 'images/8th.png',
    'dotted8th': 'images/dotted8th.png',
    '4th': 'images/4th.png',
    'dotted4th': 'images/dotted4th.png',
    'half': 'images/half.png',
    'dottedhalf': 'images/dottedhalf.png',
    'whole': 'images/whole.png',
    'play': 'images/Play.png',
    'restart': 'images/Restart.png',
    'clear': 'images/Clear.png',
    'background': 'images/Background.jpeg',
    'startbackground': 'images/StartBackground.png',
    'back': 'images/Back.png',
    '3/4': 'images/34.png',
    '4/4': 'images/44.png',
};

// Sound Assets (key, filepath)
export const sounds = {};
const pitchList = ['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5'];
const durationList = ['16th', '8th', 'dotted8th', '4th', 'dotted4th', 'half', 'dottedhalf', 'whole'];
for (const pitch of pitchList) {
    for (const duration of durationList) {
        const key = pitch.concat(duration);
        const value = 'audio/' + key + '.wav';
        sounds[key] = value;
    }
}