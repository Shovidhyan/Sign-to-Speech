import { euclideanDistance } from './mathUtils';

export interface Landmark {
  landmarks: number[][];
  label: string;
  timestamp: number;
}

export interface Dataset {
  signs: Landmark[];
  metadata: {
    totalSigns: number;
    createdAt: string;
    version: string;
  };
}

export const predictSign = (currentLandmarks: number[][], dataset: Dataset): string | null => {
  if (!currentLandmarks.length || !dataset.signs.length) return null;

  let minDistance = Infinity;
  let predictedSign = null;

  dataset.signs.forEach(sign => {
    const distance = calculateHandDistance(currentLandmarks, sign.landmarks);
    if (distance < minDistance) {
      minDistance = distance;
      predictedSign = sign.label;
    }
  });

  // Threshold for confidence - adjust as needed
  return minDistance < 150 ? predictedSign : null;
};

const calculateHandDistance = (landmarks1: number[][], landmarks2: number[][]): number => {
  let totalDistance = 0;
  
  for (let i = 0; i < landmarks1.length; i++) {
    totalDistance += euclideanDistance(
      landmarks1[i],
      landmarks2[i]
    );
  }
  
  return totalDistance / landmarks1.length;
};