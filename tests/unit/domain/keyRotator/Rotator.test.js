import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Rotator } from '../../../../src/domain/key-manager/modules/keyRotator/rotator.js';

describe('Rotator', () => {
  let rotator;
  let mockKeyGenerator;
  let mockKeyJanitor;
  let mockKeyResolver;
  let mockMetadataManager;
  let mockLockRepo;
  let mockSession;

  beforeEach(() => {
    mockKeyGenerator = {
      generate: vi.fn()
    };

    mockKeyJanitor = {
      addKeyExpiry: vi.fn(),
      deletePrivate: vi.fn(),
      deletePublic: vi.fn(),
      deleteOriginMetadata: vi.fn(),
      deleteArchivedMetadata: vi.fn()
    };

    mockKeyResolver = {
      getActiveKid: vi.fn(),
      setActiveKid: vi.fn()
    };

    mockMetadataManager = {
      create: vi.fn(),
      read: vi.fn()
    };

    mockLockRepo = {
      acquire: vi.fn(),
      release: vi.fn()
    };

    mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn()
    };

    rotator = new Rotator({
      keyGenerator: mockKeyGenerator,
      keyJanitor: mockKeyJanitor,
      keyResolver: mockKeyResolver,
      metadataManager: mockMetadataManager,
      lockRepository: mockLockRepo
    });
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(rotator.keyGenerator).toBe(mockKeyGenerator);
      expect(rotator.keyJanitor).toBe(mockKeyJanitor);
      expect(rotator.keyResolver).toBe(mockKeyResolver);
      expect(rotator.metadataManager).toBe(mockMetadataManager);
      expect(rotator.lockRepository).toBe(mockLockRepo);
    });
  });

  describe('rotateKeys', () => {
    it('should throw if domain is not provided', async () => {
      await expect(rotator.rotateKeys(null, vi.fn(), mockSession))
        .rejects.toThrow('Invalid parameters for key rotation.');
    });

    it('should throw if updateRotationDatesCB is not provided', async () => {
      await expect(rotator.rotateKeys('example.com', null, mockSession))
        .rejects.toThrow('Invalid parameters for key rotation.');
    });

    it('should throw if updateRotationDatesCB is not a function', async () => {
      await expect(rotator.rotateKeys('example.com', 'not-a-function', mockSession))
        .rejects.toThrow('Invalid parameters for key rotation.');
    });

    it('should return null if lock acquisition fails', async () => {
      mockLockRepo.acquire.mockResolvedValue(null);

      const result = await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(result).toBeNull();
      expect(mockLockRepo.acquire).toHaveBeenCalledWith('example.com', 300);
    });

    it('should acquire lock before rotation', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockLockRepo.acquire).toHaveBeenCalledWith('example.com', 300);
    });

    it('should release lock after successful rotation', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockLockRepo.release).toHaveBeenCalledWith('example.com', 'lock-token');
    });

    it('should release lock even if rotation fails', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockRejectedValue(new Error('Generation failed'));
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockLockRepo.release).toHaveBeenCalledWith('example.com', 'lock-token');
    });

    it('should perform full successful rotation', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      const updateCB = vi.fn();
      const result = await rotator.rotateKeys('example.com', updateCB, mockSession);

      expect(result).toBe('new-kid');
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(updateCB).toHaveBeenCalledWith(mockSession);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should call prepare, commit in sequence', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyGenerator.generate).toHaveBeenCalledWith('example.com');
      expect(mockKeyJanitor.addKeyExpiry).toHaveBeenCalledWith('example.com', 'active-kid');
      expect(mockKeyResolver.setActiveKid).toHaveBeenCalledWith('example.com', 'new-kid');
    });
  });

  describe('rotation preparation (#prepareRotation)', () => {
    beforeEach(() => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
    });

    it('should generate new key for domain', async () => {
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyGenerator.generate).toHaveBeenCalledWith('example.com');
    });

    it('should throw if no active kid found during prepare', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue(null);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should add expiry to current active key', async () => {
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.addKeyExpiry).toHaveBeenCalledWith('example.com', 'active-kid');
    });
  });

  describe('rotation commit (#commitRotation)', () => {
    beforeEach(() => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
    });

    it('should throw if no previous kid found during commit', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce(null)          // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should set upcoming kid as active', async () => {
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyResolver.setActiveKid).toHaveBeenCalledWith('example.com', 'new-kid');
    });

    it('should throw if setActiveKid fails', async () => {
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue(null);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should delete previous active private key', async () => {
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.deletePrivate).toHaveBeenCalledWith('example.com', 'active-kid');
    });

    it('should delete previous active origin metadata', async () => {
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.deleteOriginMetadata).toHaveBeenCalledWith('example.com', 'active-kid');
    });

    it('should return new active kid', async () => {
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');
      mockKeyResolver.setActiveKid.mockResolvedValue('new-kid');
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);

      const result = await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(result).toBe('new-kid');
    });
  });

  describe('rotation rollback (#rollbackRotation)', () => {
    beforeEach(() => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
    });

    it('should rollback when commit fails', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid')  // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Commit failed'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      const result = await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(result).toBeNull();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should delete upcoming kid private key during rollback', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid')  // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Commit failed'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.deletePrivate).toHaveBeenCalledWith('example.com', 'new-kid');
    });

    it('should delete upcoming kid public key during rollback', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid')  // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Commit failed'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.deletePublic).toHaveBeenCalledWith('example.com', 'new-kid');
    });

    it('should delete upcoming kid origin metadata during rollback', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid')  // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Commit failed'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.deleteOriginMetadata).toHaveBeenCalledWith('example.com', 'new-kid');
    });

    it('should delete archived metadata for active kid during rollback', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid')  // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Commit failed'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockKeyJanitor.deleteArchivedMetadata).toHaveBeenCalledWith('active-kid');
    });

    it('should return null on rollback', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid')  // for commit
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      mockKeyResolver.setActiveKid.mockRejectedValue(new Error('Commit failed'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      const result = await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
    });

    it('should handle generation errors', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockRejectedValue(new Error('Generation failed'));
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');

      const result = await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(result).toBeNull();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle database transaction errors', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockResolvedValue('new-kid');
      mockKeyResolver.getActiveKid
        .mockResolvedValueOnce('active-kid')  // for prepare
        .mockResolvedValueOnce('active-kid'); // for rollback
      mockKeyJanitor.addKeyExpiry.mockResolvedValue(undefined);
      const updateCB = vi.fn().mockRejectedValue(new Error('DB error'));
      mockKeyJanitor.deletePrivate.mockResolvedValue(undefined);
      mockKeyJanitor.deletePublic.mockResolvedValue(undefined);
      mockKeyJanitor.deleteOriginMetadata.mockResolvedValue(undefined);
      mockKeyJanitor.deleteArchivedMetadata.mockResolvedValue(undefined);

      const result = await rotator.rotateKeys('example.com', updateCB, mockSession);

      expect(result).toBeNull();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should always end session', async () => {
      mockLockRepo.acquire.mockResolvedValue('lock-token');
      mockKeyGenerator.generate.mockRejectedValue(new Error('Failed'));
      mockKeyResolver.getActiveKid.mockResolvedValue('active-kid');

      await rotator.rotateKeys('example.com', vi.fn(), mockSession);

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
