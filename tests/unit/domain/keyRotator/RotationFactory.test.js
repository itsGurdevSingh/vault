import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RotationFactory } from '../../../../src/domain/key-manager/modules/keyRotator/rotationFactory.js';

describe('RotationFactory', () => {
  let mockRotatorDeps;
  let mockSchedulerDeps;

  beforeEach(() => {
    RotationFactory.schedulerInstance = null;

    mockRotatorDeps = {
      keyGenerator: { generate: vi.fn() },
      keyJanitor: { addKeyExpiry: vi.fn() },
      keyResolver: { getActiveKid: vi.fn() },
      metadataManager: { create: vi.fn() },
      LockRepo: { acquire: vi.fn(), release: vi.fn() }
    };

    mockSchedulerDeps = {
      state: { maxRetries: 3, retryIntervalMs: 1000 },
      policyRepo: { getDueForRotation: vi.fn(), getSession: vi.fn() }
    };
  });

  describe('constructor', () => {
    it('should initialize with rotator dependencies', () => {
      const factory = new RotationFactory(mockRotatorDeps, mockSchedulerDeps);

      expect(factory.keyGenerator).toBe(mockRotatorDeps.keyGenerator);
      expect(factory.keyJanitor).toBe(mockRotatorDeps.keyJanitor);
      expect(factory.keyResolver).toBe(mockRotatorDeps.keyResolver);
      expect(factory.metadataManager).toBe(mockRotatorDeps.metadataManager);
      expect(factory.LockRepo).toBe(mockRotatorDeps.LockRepo);
    });

    it('should initialize with scheduler dependencies', () => {
      const factory = new RotationFactory(mockRotatorDeps, mockSchedulerDeps);

      expect(factory.state).toBe(mockSchedulerDeps.state);
      expect(factory.policyRepo).toBe(mockSchedulerDeps.policyRepo);
    });

    it('should accept custom dependencies', () => {
      const customRotatorDeps = {
        keyGenerator: { id: 'custom-gen' },
        keyJanitor: { id: 'custom-janitor' },
        keyResolver: { id: 'custom-resolver' },
        metadataManager: { id: 'custom-meta' },
        LockRepo: { id: 'custom-lock' }
      };
      const customSchedulerDeps = {
        state: { custom: 'state' },
        policyRepo: { custom: 'repo' }
      };

      const factory = new RotationFactory(customRotatorDeps, customSchedulerDeps);

      expect(factory.keyGenerator).toBe(customRotatorDeps.keyGenerator);
      expect(factory.state).toBe(customSchedulerDeps.state);
    });
  });

  describe('create', () => {
    it('should create RotationScheduler', () => {
      const factory = new RotationFactory(mockRotatorDeps, mockSchedulerDeps);

      const scheduler = factory.create();

      expect(scheduler).toBeDefined();
      expect(scheduler.rotator).toBeDefined();
      expect(scheduler.policyRepo).toBe(mockSchedulerDeps.policyRepo);
      expect(scheduler.state).toBe(mockSchedulerDeps.state);
    });

    it('should create Rotator with correct dependencies', () => {
      const factory = new RotationFactory(mockRotatorDeps, mockSchedulerDeps);

      const scheduler = factory.create();

      expect(scheduler.rotator.keyGenerator).toBe(mockRotatorDeps.keyGenerator);
      expect(scheduler.rotator.keyJanitor).toBe(mockRotatorDeps.keyJanitor);
      expect(scheduler.rotator.keyResolver).toBe(mockRotatorDeps.keyResolver);
      expect(scheduler.rotator.metadataManager).toBe(mockRotatorDeps.metadataManager);
      expect(scheduler.rotator.lockRepo).toBe(mockRotatorDeps.LockRepo);
    });

    it('should create new RotationScheduler instance each time', () => {
      const factory = new RotationFactory(mockRotatorDeps, mockSchedulerDeps);

      const scheduler1 = factory.create();
      const scheduler2 = factory.create();

      expect(scheduler1).not.toBe(scheduler2);
    });

    it('should create new Rotator instance each time', () => {
      const factory = new RotationFactory(mockRotatorDeps, mockSchedulerDeps);

      const scheduler1 = factory.create();
      const scheduler2 = factory.create();

      expect(scheduler1.rotator).not.toBe(scheduler2.rotator);
    });
  });

  describe('getInstances (singleton)', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = RotationFactory.getInstances(mockRotatorDeps, mockSchedulerDeps);
      const instance2 = RotationFactory.getInstances(mockRotatorDeps, mockSchedulerDeps);

      expect(instance1).toBe(instance2);
    });

    it('should create instance on first call', () => {
      expect(RotationFactory.schedulerInstance).toBeNull();

      const instance = RotationFactory.getInstances(mockRotatorDeps, mockSchedulerDeps);

      expect(instance).toBeDefined();
      expect(RotationFactory.schedulerInstance).toBe(instance);
    });

    it('should initialize with rotator dependencies', () => {
      const instance = RotationFactory.getInstances(mockRotatorDeps, mockSchedulerDeps);

      expect(instance.keyGenerator).toBe(mockRotatorDeps.keyGenerator);
      expect(instance.keyJanitor).toBe(mockRotatorDeps.keyJanitor);
      expect(instance.keyResolver).toBe(mockRotatorDeps.keyResolver);
      expect(instance.metadataManager).toBe(mockRotatorDeps.metadataManager);
      expect(instance.LockRepo).toBe(mockRotatorDeps.LockRepo);
    });

    it('should initialize with scheduler dependencies', () => {
      const instance = RotationFactory.getInstances(mockRotatorDeps, mockSchedulerDeps);

      expect(instance.state).toBe(mockSchedulerDeps.state);
      expect(instance.policyRepo).toBe(mockSchedulerDeps.policyRepo);
    });

    it('should ignore parameters on subsequent calls', () => {
      const deps1 = { ...mockRotatorDeps, keyGenerator: { id: 1 } };
      const deps2 = { ...mockRotatorDeps, keyGenerator: { id: 2 } };

      const instance1 = RotationFactory.getInstances(deps1, mockSchedulerDeps);
      const instance2 = RotationFactory.getInstances(deps2, mockSchedulerDeps);

      expect(instance1).toBe(instance2);
      expect(instance1.keyGenerator).toBe(deps1.keyGenerator);
    });
  });
});
