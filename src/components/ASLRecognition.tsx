import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/handpose';
import * as fp from 'fingerpose';
import { Volume2, Camera, Download, Upload, Play, X } from 'lucide-react';
import { ASLAlphabet } from '../utils/ASLAlphabet';
import { Dataset, predictSign } from '../utils/gestureRecognition';

interface CapturedSign {
  landmarks: number[][];
  label: string;
  timestamp: number;
}

interface Language {
  code: string;
  name: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' }
];


const COMMON_WORDS_TRANSLATIONS: Record<string, Record<string, string>> = {
  'yes': {
    'ta': 'ஆம்',
    'hi': 'हाँ',
    'te': 'అవును',
    'ml': 'അതെ',
    'kn': 'ಹೌದು'
  },
  'no': {
    'ta': 'இல்லை',
    'hi': 'नहीं',
    'te': 'కాదు',
    'ml': 'ഇല്ല',
    'kn': 'ಇಲ್ಲ'
  },
  'hello': {
    'ta': 'வணக்கம்',
    'hi': 'नमस्ते',
    'te': 'హలో',
    'ml': 'ഹലോ',
    'kn': 'ನಮಸ್ಕಾರ'
  },
  'thank you': {
    'ta': 'நன்றி',
    'hi': 'धन्यवाद',
    'te': 'ధన్యవాదాలు',
    'ml': 'നന്ദി',
    'kn': 'ಧನ್ಯವಾದ'
  },
  'i love you': {
    'ta': 'நான் உன்னை காதலிக்கிறேன்',
    'hi': 'मैं तुमसे प्यार करता हूँ',
    'te': 'నేను నిన్ను ప్రేమిస్తున్నాను',
    'ml': 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു',
    'kn': 'ನಾನು ನಿನ್ನನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ'
  },
  'how': {
    'ta': 'எப்படி',
    'hi': 'कैसे',
    'te': 'ఎలా',
    'ml': 'എങ്ങനെ',
    'kn': 'ಹೇಗೆ'
  },
  'when': {
    'ta': 'எப்போது',
    'hi': 'कब',
    'te': 'ఎప్పుడు',
    'ml': 'എപ്പോൾ',
    'kn': 'ಯಾವಾಗ'
  },
  'drink': {
    'ta': 'குடி',
    'hi': 'पीना',
    'te': 'తాగు',
    'ml': 'കുടിക്കുക',
    'kn': 'ಕುಡಿ'
  },
  'help': {
    'ta': 'உதவி',
    'hi': 'मदद',
    'te': 'సహాయం',
    'ml': 'സഹായം',
    'kn': 'ಸಹಾಯ'
  },
  'what-do': {
    'ta': 'என்ன செய்',
    'hi': 'क्या करो',
    'te': 'ఏమి చేయాలి',
    'ml': 'എന്തു ചെയ്യണം',
    'kn': 'ಏನು ಮಾಡು'
  },
  'think': {
    'ta': 'நினைக்கிறேன்',
    'hi': 'सोचो',
    'te': 'ఆలోచించు',
    'ml': 'ചിന്തിക്കുക',
    'kn': 'ಯೋಚಿಸು'
  },
  'i': {
    'ta': 'நான்',
    'hi': 'मैं',
    'te': 'నేను',
    'ml': 'ഞാൻ',
    'kn': 'ನಾನು'
  },
  'you': {
    'ta': 'நீங்கள்',
    'hi': 'तुम',
    'te': 'నువ్వు',
    'ml': 'നീ',
    'kn': 'ನೀನು'
  },
  'family': {
    'ta': 'குடும்பம்',
    'hi': 'परिवार',
    'te': 'కుటుంబం',
    'ml': 'കുടുംബം',
    'kn': 'ಕುಟುಂಬ'
  },
  'sorry': {
    'ta': 'மன்னிக்கவும்',
    'hi': 'माफ़ कीजिए',
    'te': 'క్షమించండి',
    'ml': 'ക്ഷമിക്കണം',
    'kn': 'ಕ್ಷಮಿಸಿ'
  },
  'i dont understand': {
    'ta': 'எனக்கு புரியவில்லை',
    'hi': 'मैं नहीं समझा',
    'te': 'నాకు అర్థం కాలేదు',
    'ml': 'എനിക്ക് മനസ്സിലാകുന്നില്ല',
    'kn': 'ನನಗೆ ಅರ್ಥವಾಗುತ್ತಿಲ್ಲ'
  },
  'how are you': {
    'ta': 'எப்படி இருக்கிறீர்கள்',
    'hi': 'आप कैसे हैं',
    'te': 'మీరు ఎలా ఉన్నారు',
    'ml': 'എങ്ങനെയിരിക്കുന്നു',
    'kn': 'ನೀವು ಹೇಗಿದ್ದೀರಿ'
  },
  'tell': {
    'ta': 'சொல்லுங்கள்',
    'hi': 'बताओ',
    'te': 'చెప్పు',
    'ml': 'പറയുക',
    'kn': 'ಹೇಳು'
  }
};

const ASLRecognition: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<handpose.HandPose | null>(null);
  const [prediction, setPrediction] = useState<string>('');
  const [sentence, setSentence] = useState<string>('');
  const [translatedWords, setTranslatedWords] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(''); // Default to empty
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSigns, setCapturedSigns] = useState<CapturedSign[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [currentHand, setCurrentHand] = useState<number[][]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [mode, setMode] = useState<'capture' | 'predict'>('capture');
  const [predictedSign, setPredictedSign] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      await tf.setBackend('webgl');
      const net = await handpose.load();
      setModel(net);
    };
    loadModel();
  }, []);

  const translateText = async (text: string): Promise<string> => {
    if (!text.trim()) return '';

    // First check if we have a hardcoded translation for this exact phrase
    const lowerText = text.toLowerCase();
    if (COMMON_WORDS_TRANSLATIONS[lowerText]?.[selectedLanguage]) {
      return COMMON_WORDS_TRANSLATIONS[lowerText][selectedLanguage];
    }

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=AIzaSyDRp6NKo0ibRiLBHd1cofiQkKGjrDJMhrU`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            source: 'en',
            target: selectedLanguage,
            format: 'text',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Translation service unavailable`);
      }

      const data = await response.json();
      return data.data?.translations?.[0]?.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Translation failed. Please try again.');
      return text;
    } finally {
      setIsTranslating(false);
    }
  };

  const translateSentence = async (sentence: string): Promise<string> => {
    if (!selectedLanguage) return sentence; // Return original if no language selected
    
    // First check if the entire sentence exists in our common words
    const lowerSentence = sentence.toLowerCase();
    if (COMMON_WORDS_TRANSLATIONS[lowerSentence]?.[selectedLanguage]) {
      return COMMON_WORDS_TRANSLATIONS[lowerSentence][selectedLanguage];
    }
  
    // Then check if it's a multi-word phrase we want to keep together
    const phrasesToKeepTogether = ['i love you', 'thank you', 'how are you'];
    for (const phrase of phrasesToKeepTogether) {
      if (lowerSentence.includes(phrase)) {
        const translatedPhrase = COMMON_WORDS_TRANSLATIONS[phrase]?.[selectedLanguage] || phrase;
        return sentence.replace(new RegExp(phrase, 'i'), translatedPhrase);
      }
    }
  
    // Fall back to translating the entire sentence
    return await translateText(sentence);
  };

  
  const drawHand = (predictions: handpose.AnnotatedPrediction[], ctx: CanvasRenderingContext2D) => {
    predictions.forEach(prediction => {
      const landmarks = prediction.landmarks;
      
      for (let i = 0; i < landmarks.length; i++) {
        const [x, y] = landmarks[i];
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
      }
      
      const fingerIndices = [
        [0, 1, 2, 3, 4],
        [0, 5, 6, 7, 8],
        [0, 9, 10, 11, 12],
        [0, 13, 14, 15, 16],
        [0, 17, 18, 19, 20]
      ];
      
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      
      fingerIndices.forEach(finger => {
        for (let i = 0; i < finger.length - 1; i++) {
          const [x1, y1] = landmarks[finger[i]];
          const [x2, y2] = landmarks[finger[i + 1]];
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });
    });
  };

  const detect = async () => {
    if (model && webcamRef.current && canvasRef.current) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (video && video.readyState === 4 && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const hand = await model.estimateHands(video);
        if (hand.length > 0) {
          drawHand(hand, ctx);
          const landmarks = hand[0].landmarks;
          setCurrentHand(landmarks);

          if (mode === 'predict' && dataset) {
            const prediction = predictSign(landmarks, dataset);
            if (prediction) {
              setPredictedSign(prediction);
            }
          } else {
            const GE = new fp.GestureEstimator(ASLAlphabet);
            const gesture = await GE.estimate(landmarks, 8);
            if (gesture.gestures.length > 0) {
              const confidence = gesture.gestures.map(prediction => prediction.confidence);
              const maxConfidence = confidence.indexOf(Math.max(...confidence));
              
              if (maxConfidence >= 0 && maxConfidence < gesture.gestures.length) {
                const letter = gesture.gestures[maxConfidence].name;
                setPrediction(letter);
              }
            }
          }
        } else {
          setCurrentHand([]);
          setPredictedSign('');
        }
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      detect();
    }, 100);
    return () => clearInterval(interval);
  }, [model, mode, dataset]);

  const addToSentence = async () => {
    const signToAdd = mode === 'predict' ? predictedSign : prediction;
    if (signToAdd) {
      const newSentence = sentence + (sentence ? ' ' : '') + signToAdd;
      setSentence(newSentence);

      if (selectedLanguage) {
        // Translate the entire sentence
        const translatedSentence = await translateSentence(newSentence);
        setTranslatedWords([translatedSentence]); // Store the translated sentence as a single entry
      }
    }
  };

  const captureSign = () => {
    if (currentHand.length > 0 && newLabel.trim()) {
      const newSign: CapturedSign = {
        landmarks: currentHand,
        label: newLabel.trim(),
        timestamp: Date.now()
      };
      setCapturedSigns(prev => [...prev, newSign]);
      setNewLabel('');
    }
  };

  const downloadDataset = () => {
    if (capturedSigns.length > 0) {
      const datasetToSave = {
        signs: capturedSigns,
        metadata: {
          totalSigns: capturedSigns.length,
          createdAt: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify(datasetToSave, null, 2)], {type: 'application/json'});
      element.href = URL.createObjectURL(file);
      element.download = 'isl-dataset.json';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const loadDataset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedDataset = JSON.parse(e.target?.result as string);
          setDataset(loadedDataset);
          setMode('predict');
        } catch (error) {
          console.error('Error loading dataset:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Clear translated words when language changes
  useEffect(() => {
    const translateAllWords = async () => {
      setTranslatedWords([]);
      const words = sentence.trim().split(' ').filter(word => word.trim() !== '');
      const translatedResults = await Promise.all(words.map(word => translateWord(word)));
      setTranslatedWords(translatedResults);
    };

    translateAllWords();
  }, [selectedLanguage]);

  // Clear translated words and translate the entire sentence when the language changes
  useEffect(() => {
    const translateEntireSentence = async () => {
      if (sentence.trim() && selectedLanguage) {
        const translatedSentence = await translateSentence(sentence);
        setTranslatedWords([translatedSentence]); // Store the translated sentence as a single entry
      } else {
        setTranslatedWords([]); // Clear translations if no language is selected
      }
    };

    translateEntireSentence();
  }, [selectedLanguage, sentence]);

  const speakTranslatedText = () => {
    if (translatedWords.length > 0) {
      const speech = new SpeechSynthesisUtterance(translatedWords.join(' '));
      speech.lang = selectedLanguage;
      speech.rate = 1; // Increase the rate for faster speech
      window.speechSynthesis.speak(speech);
    }
  };

  const clearTranslatedWords = () => {
    setTranslatedWords([]);
    setTranslationError(null); // Clear the error
    setSelectedLanguage(''); // Reset to "Select Language"
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-0">
      <div className="w-full max-w-[100vw] mx-auto">
        <h1 className="text-xl font-bold text-center mb-0 text-[#8b4c2c]">ISL Recognition</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-1">
          <div className="flex flex-col gap-0 mb-1">
            <div className="flex gap-1 w-full">
              <button
                onClick={() => setMode('capture')}
                className={`px-3 py-2 rounded-lg flex-1 ${
                  mode === 'capture'
                    ? 'bg-[#8b4c2c] text-white'
                    : 'bg-[#c9a383] text-[#8b4c2c]'
                }`}
              >
                Capture
              </button>
              <button
                onClick={() => setMode('predict')}
                className={`px-3 py-2 rounded-lg flex-1 ${
                  mode === 'predict'
                    ? 'bg-[#8b4c2c] text-white'
                    : 'bg-[#c9a383] text-[#8b4c2c]'
                }`}
              >
                Predict
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-0">
            <div className="relative w-full h-96 mt-0 mb-0">
              <Webcam
                ref={webcamRef}
                className="w-full h-full rounded-lg transform -scale-x-100"
                videoConstraints={{
                  width: 720,
                  height: 1280,
                  facingMode: "user"
                }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full transform -scale-x-100"
              />
            </div>

            <div className="space-y-3">
              <div className="bg-[#f5f5f5] p-3 rounded-lg">
                <h2 className="text-base font-semibold mb-1 text-[#8b4c2c]">Current Sign</h2>
                <p className="text-xl font-bold text-[#8b4c2c]">{mode === 'predict' ? predictedSign : prediction}</p>
              </div>

              {mode === 'capture' && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Enter sign label"
                      className="px-3 py-2 rounded-lg border border-[#c9a383] w-full focus:outline-none focus:ring-2 focus:ring-[#8b4c2c]"
                    />
                    <button
                      onClick={captureSign}
                      className="px-3 py-2 rounded-lg bg-[#8b4c2c] text-white flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Capture
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadDataset}
                      className="px-3 py-2 rounded-lg bg-[#8b4c2c] text-white flex items-center justify-center gap-2 flex-1"
                    >
                      <Download className="w-4 h-4" />
                      Save
                    </button>
                    <label className="px-3 py-2 rounded-lg bg-[#8b4c2c] text-white flex items-center justify-center gap-2 flex-1 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Load
                      <input
                        type="file"
                        accept=".json"
                        onChange={loadDataset}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={addToSentence}
                className="w-full px-3 py-2 rounded-lg bg-[#8b4c2c] text-white flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Add to Sentence
              </button>
            </div>
          </div>

          {mode === 'predict' && (
            <div className="space-y-3 mt-4">
              <div className="bg-[#f5f5f5] p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-[#8b4c2c]">Current Sentence</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (sentence) {
                          const speech = new SpeechSynthesisUtterance(sentence);
                          speech.lang = 'en-US';
                          speech.rate = 1.5;
                          window.speechSynthesis.speak(speech);
                        }
                      }}
                      className="p-1.5 rounded-full bg-[#c9a383]"
                      title="Speak current sentence"
                    >
                      <Volume2 className="w-4 h-4 text-[#8b4c2c]" />
                    </button>
                    <button
                      onClick={() => setSentence('')}
                      className="p-1.5 rounded-full bg-red-500"
                      title="Clear current sentence"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
                <p className="text-lg text-[#8b4c2c]">{sentence}</p>
              </div>

              <div className="bg-[#f5f5f5] p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-[#8b4c2c]">Translation</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={speakTranslatedText}
                      className="p-1.5 rounded-full bg-[#c9a383]"
                      title="Speak translation"
                      disabled={!translatedWords.length || !selectedLanguage}
                    >
                      <Volume2 className="w-4 h-4 text-[#8b4c2c]" />
                    </button>
                    <button
                      onClick={clearTranslatedWords}
                      className="p-1.5 rounded-full bg-red-500"
                      title="Clear translation"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
                {isTranslating ? (
                  <p className="text-[#8b4c2c]">Translating...</p>
                ) : translationError ? (
                  <p className="text-red-500">{translationError}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {translatedWords.map((word, index) => (
                      <span key={index} className="text-lg text-[#8b4c2c] bg-[#c9a383] px-2 py-1 rounded-lg">
                        {word}
                      </span>
                    ))}
                  </div>
                )}
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#c9a383] text-sm focus:outline-none focus:ring-2 focus:ring-[#8b4c2c]"
                >
                  <option value="">Select Language</option>
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ASLRecognition;