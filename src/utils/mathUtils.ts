export const euclideanDistance = (point1: number[], point2: number[]): number => {
  return Math.sqrt(
    point1.reduce((sum, coord, i) => {
      return sum + Math.pow(coord - point2[i], 2);
    }, 0)
  );
};