import { describe, it, expect } from 'vitest';
import { deriveTransferEvidence } from './learnerStateV2Service';
import { NewHire } from '../types';

describe('deriveTransferEvidence', () => {
  it('should detect TRANSFERRED status when performance evidence passes under multiple variation contexts', () => {
    const mockHire: NewHire = {
      currentDay: 3,
      daysHistory: [
        {
          dayNumber: 1,
          workSignal: { actualPickRate: 50, targetPickRate: 50, accuracyRate: 100, congestion: true }
        },
        {
          dayNumber: 2,
          workSignal: { actualPickRate: 50, targetPickRate: 50, accuracyRate: 99, externalBottleneck: "facility-a" }
        }
      ],
    } as any;

    const result = deriveTransferEvidence(mockHire);
    // Assuming capId 14 is Route Optimization
    expect(result[14].transferStatus).toBe('TRANSFERRED');
  });

  it('should detect BREAKS_UNDER_VARIATION status when performance fails under variation and is not explained', () => {
    const mockHire: NewHire = {
      currentDay: 2,
      daysHistory: [
        {
          dayNumber: 1,
          workSignal: { actualPickRate: 20, targetPickRate: 50, accuracyRate: 90, congestion: false },
          dailySignal: { category: "Process" } // Variation detected, but performance is poor and not explained
        }
      ],
    } as any;

    const result = deriveTransferEvidence(mockHire);
    expect(result[14].transferStatus).toBe('BREAKS_UNDER_VARIATION');
  });
  
  it('should detect EMERGING status when performance is good under one variation context', () => {
    const mockHire: NewHire = {
      currentDay: 2,
      daysHistory: [
        {
          dayNumber: 1,
          workSignal: { actualPickRate: 50, targetPickRate: 50, accuracyRate: 100, congestion: true }
        }
      ],
    } as any;

    const result = deriveTransferEvidence(mockHire);
    expect(result[14].transferStatus).toBe('EMERGING');
  });
});
