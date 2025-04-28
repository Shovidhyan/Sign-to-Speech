import * as fp from 'fingerpose';

const ASLAlphabet = [
  // A-Z gestures will be defined here
  // This is a simplified example - you would need to define the full set of gestures
  new fp.GestureDescription('A'),
  new fp.GestureDescription('B'),
  // ... more letters
];

// Define finger positions for each letter
// Example for 'A':
ASLAlphabet[0].addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
ASLAlphabet[0].addCurl(fp.Finger.Index, fp.FingerCurl.FullCurl, 1.0);
ASLAlphabet[0].addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
ASLAlphabet[0].addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
ASLAlphabet[0].addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);

// Continue defining other letters...

export { ASLAlphabet };