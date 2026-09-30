import { Alternative, Criterion, CalculationResult } from './types';
import { calculateSaw } from './saw';
import { calculateMoora } from './moora';

export * from './types';
export * from './saw';
export * from './moora';

export function runSpkCalculation(
  method: 'saw' | 'moora',
  alternatives: Alternative[],
  criteria: Criterion[]
): CalculationResult {
  switch (method.toLowerCase()) {
    case 'moora':
      return calculateMoora(alternatives, criteria);
    case 'saw':
    default:
      return calculateSaw(alternatives, criteria);
  }
}
