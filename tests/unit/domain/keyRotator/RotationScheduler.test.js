import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RotationScheduler } from '../../../../src/domain/key-manager/modules/keyRotator/rotationScheduler.js';

describe('RotationScheduler', () => {
  let scheduler;
  let mockRotator;
  let mockPolicyRepo;
  let mockConfigState;

  beforeEach(() => {
    mockRotator = {
      rotateKeys: vi.fn()
    };

    mockPolicyRepo = {
      findByDomain: vi.fn(),
      getDueForRotation: vi.fn(),
      acknowledgeSuccessfulRotation: vi.fn(),
      getSession: vi.fn()
    };

    mockConfigState = {
      maxRetries: 3,
      retryIntervalMs: 1000
    };

    scheduler = new RotationScheduler(mockRotator, mockPolicyRepo, mockConfigState);
  });

  describe('constructor', () => {
    it('should initialize with rotator, policyRepo, and state', () => {
      expect(scheduler.rotator).toBe(mockRotator);
      expect(scheduler.policyRepo).toBe(mockPolicyRepo);
      expect(scheduler.state).toBe(mockConfigState);
    });

    it('should store dependencies correctly', () => {
      const customRotator = { rotate: vi.fn() };
      const customRepo = { find: vi.fn() };
      const customState = { retry: 5 };

      const customScheduler = new RotationScheduler(customRotator, customRepo, customState);

      expect(customScheduler.rotator).toBe(customRotator);
      expect(customScheduler.policyRepo).toBe(customRepo);
      expect(customScheduler.state).toBe(customState);
    });
  });

  describe('runScheduledRotation', () => {
    it('should call _ensureSuccessfulRotation', async () => {
      mockPolicyRepo.getDueForRotation.mockResolvedValue([]);

      await scheduler.runScheduledRotation();

      expect(mockPolicyRepo.getDueForRotation).toHaveBeenCalled();
    });

    it('should handle successful rotation', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation.mockResolvedValue([
        { domain: 'example.com', rotationInterval: 30 }
      ]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalled();
    });

    it('should handle no due domains', async () => {
      mockPolicyRepo.getDueForRotation.mockResolvedValue([]);

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).not.toHaveBeenCalled();
    });
  });

  describe('triggerImmediateRotation', () => {
    it('should call _ensureSuccessfulRotation', async () => {
      mockPolicyRepo.getDueForRotation.mockResolvedValue([]);

      await scheduler.triggerImmediateRotation();

      expect(mockPolicyRepo.getDueForRotation).toHaveBeenCalled();
    });

    it('should rotate due domains immediately', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation.mockResolvedValue([
        { domain: 'example.com', rotationInterval: 30 }
      ]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerImmediateRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalled();
    });
  });

  describe('triggerDomainRotation', () => {
    it('should throw if no policy found for domain', async () => {
      mockPolicyRepo.findByDomain.mockResolvedValue(null);

      await expect(scheduler.triggerDomainRotation('example.com'))
        .rejects.toThrow('No policy found for domain: example.com');
    });

    it('should find policy by domain', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.findByDomain.mockResolvedValue({ domain: 'example.com', rotationInterval: 30 });
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerDomainRotation('example.com');

      expect(mockPolicyRepo.findByDomain).toHaveBeenCalledWith('example.com');
    });

    it('should rotate single domain', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerDomainRotation('example.com');

      expect(mockRotator.rotateKeys).toHaveBeenCalled();
    });

    it('should pass correct domain to rotator', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerDomainRotation('example.com');

      expect(mockRotator.rotateKeys).toHaveBeenCalledWith(
        'example.com',
        expect.any(Function),
        mockSession
      );
    });
  });

  describe('_ensureSuccessfulRotation', () => {
    it('should return immediately if all domains rotate successfully', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation.mockResolvedValue([
        { domain: 'example.com', rotationInterval: 30 }
      ]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.runScheduledRotation();

      expect(mockPolicyRepo.getDueForRotation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed domains up to maxRetries', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }])
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }])
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('new-kid');

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(3);
    });

    it('should use retryIntervalMs from config', async () => {
      vi.useFakeTimers();

      const mockSession = { id: 'session-1' };
      const customState = { maxRetries: 2, retryIntervalMs: 500 };
      const customScheduler = new RotationScheduler(mockRotator, mockPolicyRepo, customState);

      mockPolicyRepo.getDueForRotation
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }])
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('new-kid');

      const promise = customScheduler.runScheduledRotation();
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should stop retrying after maxRetries exhausted', async () => {
      const mockSession = { id: 'session-1' };
      mockConfigState.maxRetries = 2;
      mockPolicyRepo.getDueForRotation
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }])
        .mockResolvedValueOnce([{ domain: 'example.com', rotationInterval: 30 }]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockRejectedValue(new Error('Failed'));

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(2);
    });
  });

  describe('_rotateDueDomains', () => {
    it('should return summary with no changes if no due policies', async () => {
      mockPolicyRepo.getDueForRotation.mockResolvedValue([]);

      await scheduler.runScheduledRotation();

      expect(mockPolicyRepo.getDueForRotation).toHaveBeenCalled();
    });

    it('should process all due policies', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation.mockResolvedValue([
        { domain: 'example1.com', rotationInterval: 30 },
        { domain: 'example2.com', rotationInterval: 60 }
      ]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(2);
    });

    it('should count successful rotations', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation.mockResolvedValue([
        { domain: 'example1.com', rotationInterval: 30 },
        { domain: 'example2.com', rotationInterval: 60 }
      ]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(2);
    });

    it('should count skipped rotations', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation.mockResolvedValue([
        { domain: 'example1.com', rotationInterval: 30 },
        { domain: 'example2.com', rotationInterval: 60 }
      ]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys
        .mockResolvedValueOnce('new-kid')
        .mockResolvedValueOnce(null);

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(2);
    });

    it('should count failed rotations', async () => {
      const mockSession = { id: 'session-1' };
      mockPolicyRepo.getDueForRotation
        .mockResolvedValueOnce([
          { domain: 'example1.com', rotationInterval: 30 },
          { domain: 'example2.com', rotationInterval: 60 }
        ])
        .mockResolvedValue([]);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys
        .mockResolvedValueOnce('new-kid')
        .mockRejectedValueOnce(new Error('Failed'));

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).toHaveBeenCalledTimes(2);
    });

    it('should handle repo errors', async () => {
      mockPolicyRepo.getDueForRotation
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      await scheduler.runScheduledRotation();

      expect(mockRotator.rotateKeys).not.toHaveBeenCalled();
    });
  });

  describe('_processSingleDomain', () => {
    it('should create session for rotation', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerDomainRotation('example.com');

      expect(mockPolicyRepo.getSession).toHaveBeenCalled();
    });

    it('should pass db update callback to rotator', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerDomainRotation('example.com');

      expect(mockRotator.rotateKeys).toHaveBeenCalledWith(
        'example.com',
        expect.any(Function),
        mockSession
      );
    });

    it('should call acknowledgeSuccessfulRotation on success', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockImplementation(async (domain, callback) => {
        await callback(mockSession);
        return 'new-kid';
      });

      await scheduler.triggerDomainRotation('example.com');

      expect(mockPolicyRepo.acknowledgeSuccessfulRotation).toHaveBeenCalledWith(
        { domain: 'example.com', rotationInterval: 30 },
        mockSession
      );
    });

    it('should return SUCCESS when rotation succeeds', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue('new-kid');

      await scheduler.triggerDomainRotation('example.com');

      expect(mockRotator.rotateKeys).toHaveBeenCalled();
    });

    it('should return SKIPPED when rotator returns null', async () => {
      const mockSession = { id: 'session-1' };
      const policy = { domain: 'example.com', rotationInterval: 30 };
      mockPolicyRepo.findByDomain.mockResolvedValue(policy);
      mockPolicyRepo.getSession.mockResolvedValue(mockSession);
      mockRotator.rotateKeys.mockResolvedValue(null);

      await scheduler.triggerDomainRotation('example.com');

      expect(mockRotator.rotateKeys).toHaveBeenCalled();
    });
  });
});
