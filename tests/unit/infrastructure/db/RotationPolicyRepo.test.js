import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock functions that we'll reference
const mockSave = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockFindOneAndDelete = vi.fn();
const mockFind = vi.fn();
const mockStartSession = vi.fn();

// Create a mock constructor that behaves like a Mongoose model
const MockRotationPolicyConstructor = function (data) {
    this.data = data;
    this.domain = data.domain;
    this.save = mockSave;
    return this;
};

// Add static methods
MockRotationPolicyConstructor.findOne = mockFindOne;
MockRotationPolicyConstructor.findOneAndUpdate = mockFindOneAndUpdate;
MockRotationPolicyConstructor.findOneAndDelete = mockFindOneAndDelete;
MockRotationPolicyConstructor.find = mockFind;
MockRotationPolicyConstructor.db = {
    startSession: mockStartSession
};

// Mock the model module
vi.mock('../../../../src/infrastructure/db/models/RotationPolicy.model.js', () => ({
    rotationPolicy: MockRotationPolicyConstructor
}));

// Now import the repo (after the mock is set up)
const { rotationPolicyRepository } = await import('../../../../src/infrastructure/db/repositories/rotationPolicyRepository');

describe('RotationPolicyRepo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with model and db', () => {
            expect(rotationPolicyRepository.model).toBeDefined();
            expect(rotationPolicyRepository.db).toBeDefined();
        });
    });

    describe('findByDomain', () => {
        it('should normalize domain to uppercase and trim', async () => {
            mockFindOne.mockResolvedValue({ domain: 'EXAMPLE' });

            await rotationPolicyRepository.findByDomain('  example  ');

            expect(mockFindOne).toHaveBeenCalledWith({ domain: 'EXAMPLE' });
        });

        it('should find policy by domain', async () => {
            const mockPolicy = { domain: 'TEST', intervalDays: 30 };
            mockFindOne.mockResolvedValue(mockPolicy);

            const result = await rotationPolicyRepository.findByDomain('test');

            expect(result).toEqual(mockPolicy);
        });

        it('should return null when policy not found', async () => {
            mockFindOne.mockResolvedValue(null);

            const result = await rotationPolicyRepository.findByDomain('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle mixed case domains', async () => {
            mockFindOne.mockResolvedValue({ domain: 'MIXEDCASE' });

            await rotationPolicyRepository.findByDomain('MiXeDcAsE');

            expect(mockFindOne).toHaveBeenCalledWith({ domain: 'MIXEDCASE' });
        });

        it('should handle domains with whitespace', async () => {
            mockFindOne.mockResolvedValue({});

            await rotationPolicyRepository.findByDomain('  domain_with_spaces  ');

            expect(mockFindOne).toHaveBeenCalledWith({ domain: 'DOMAIN_WITH_SPACES' });
        });

        it('should propagate database errors', async () => {
            const error = new Error('Database connection failed');
            mockFindOne.mockRejectedValue(error);

            await expect(rotationPolicyRepository.findByDomain('test'))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('createPolicy', () => {
        it('should normalize domain before creating', async () => {
            const data = { domain: '  example  ', intervalDays: 30 };
            const expected = { ...data, domain: 'EXAMPLE', _id: '123' };

            mockSave.mockResolvedValue(expected);

            await rotationPolicyRepository.createPolicy(data);

            // Verify save was called
            expect(mockSave).toHaveBeenCalled();
        });

        it('should create policy with normalized domain', async () => {
            const data = { domain: 'newdomain', intervalDays: 60 };
            const mockPolicy = { ...data, domain: 'NEWDOMAIN', _id: '123' };

            mockSave.mockResolvedValue(mockPolicy);

            const result = await rotationPolicyRepository.createPolicy(data);

            expect(result.domain).toBe('NEWDOMAIN');
        });

        it('should preserve other data fields', async () => {
            const data = {
                domain: 'test',
                intervalDays: 90,
                note: 'Test policy',
                enabled: true
            };
            const saved = { ...data, domain: 'TEST', _id: '456' };

            mockSave.mockResolvedValue(saved);

            const result = await rotationPolicyRepository.createPolicy(data);

            expect(result.intervalDays).toBe(90);
            expect(result.note).toBe('Test policy');
            expect(result.enabled).toBe(true);
        });
    });

    describe('updatePolicy', () => {
        it('should normalize domain and update policy', async () => {
            const updates = { intervalDays: 120 };
            mockFindOneAndUpdate.mockResolvedValue({ domain: 'UPDATED', ...updates });

            await rotationPolicyRepository.updatePolicy('  updated  ', updates);

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { domain: 'UPDATED' },
                updates,
                { new: true }
            );
        });

        it('should return updated policy', async () => {
            const updates = { intervalDays: 45 };
            const mockPolicy = { domain: 'TEST', intervalDays: 45 };
            mockFindOneAndUpdate.mockResolvedValue(mockPolicy);

            const result = await rotationPolicyRepository.updatePolicy('test', updates);

            expect(result).toEqual(mockPolicy);
        });

        it('should return null if policy not found', async () => {
            mockFindOneAndUpdate.mockResolvedValue(null);

            const result = await rotationPolicyRepository.updatePolicy('nonexistent', { intervalDays: 10 });

            expect(result).toBeNull();
        });

        it('should use new: true option to return updated document', async () => {
            await rotationPolicyRepository.updatePolicy('test', { note: 'Updated' });

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                { new: true }
            );
        });
    });

    describe('deletePolicy', () => {
        it('should normalize domain and delete policy', async () => {
            await rotationPolicyRepository.deletePolicy('  todelete  ');

            expect(mockFindOneAndDelete).toHaveBeenCalledWith({ domain: 'TODELETE' });
        });

        it('should return deleted policy', async () => {
            const mockPolicy = { domain: 'DELETED', intervalDays: 30 };
            mockFindOneAndDelete.mockResolvedValue(mockPolicy);

            const result = await rotationPolicyRepository.deletePolicy('deleted');

            expect(result).toEqual(mockPolicy);
        });

        it('should return null if policy not found', async () => {
            mockFindOneAndDelete.mockResolvedValue(null);

            const result = await rotationPolicyRepository.deletePolicy('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('enableRotation', () => {
        it('should normalize domain and enable rotation', async () => {
            await rotationPolicyRepository.enableRotation('  example  ');

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { domain: 'EXAMPLE' },
                { enabled: true },
                { new: true }
            );
        });

        it('should return updated policy with enabled true', async () => {
            const mockPolicy = { domain: 'EXAMPLE', enabled: true };
            mockFindOneAndUpdate.mockResolvedValue(mockPolicy);

            const result = await rotationPolicyRepository.enableRotation('example');

            expect(result.enabled).toBe(true);
        });
    });

    describe('disableRotation', () => {
        it('should normalize domain and disable rotation', async () => {
            await rotationPolicyRepository.disableRotation('  example  ');

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { domain: 'EXAMPLE' },
                { enabled: false },
                { new: true }
            );
        });

        it('should return updated policy with enabled false', async () => {
            const mockPolicy = { domain: 'EXAMPLE', enabled: false };
            mockFindOneAndUpdate.mockResolvedValue(mockPolicy);

            const result = await rotationPolicyRepository.disableRotation('example');

            expect(result.enabled).toBe(false);
        });
    });

    describe('getAllPolicies', () => {
        it('should return all policies', async () => {
            const mockPolicies = [
                { domain: 'DOMAIN1', intervalDays: 30 },
                { domain: 'DOMAIN2', intervalDays: 60 }
            ];
            mockFind.mockResolvedValue(mockPolicies);

            const result = await rotationPolicyRepository.getAllPolicies();

            expect(mockFind).toHaveBeenCalledWith({});
            expect(result).toEqual(mockPolicies);
        });

        it('should return empty array when no policies exist', async () => {
            mockFind.mockResolvedValue([]);

            const result = await rotationPolicyRepository.getAllPolicies();

            expect(result).toEqual([]);
        });
    });

    describe('getEnabledPolicies', () => {
        it('should return only enabled policies', async () => {
            const mockPolicies = [
                { domain: 'ENABLED1', enabled: true },
                { domain: 'ENABLED2', enabled: true }
            ];
            mockFind.mockResolvedValue(mockPolicies);

            const result = await rotationPolicyRepository.getEnabledPolicies();

            expect(mockFind).toHaveBeenCalledWith({ enabled: true });
            expect(result).toEqual(mockPolicies);
        });

        it('should return empty array when no enabled policies', async () => {
            mockFind.mockResolvedValue([]);

            const result = await rotationPolicyRepository.getEnabledPolicies();

            expect(result).toEqual([]);
        });
    });

    describe('getDueForRotation', () => {
        it('should find policies due before current date', async () => {
            const testDate = new Date('2024-01-15');
            const mockPolicies = [{ domain: 'DUE1', nextRotationAt: new Date('2024-01-10') }];
            mockFind.mockResolvedValue(mockPolicies);

            const result = await rotationPolicyRepository.getDueForRotation(testDate);

            expect(mockFind).toHaveBeenCalledWith({
                nextRotationAt: { $lte: testDate },
                enabled: true
            });
            expect(result).toEqual(mockPolicies);
        });

        it('should use current date by default', async () => {
            mockFind.mockResolvedValue([]);

            await rotationPolicyRepository.getDueForRotation();

            expect(mockFind).toHaveBeenCalledWith({
                nextRotationAt: { $lte: expect.any(Date) },
                enabled: true
            });
        });

        it('should only return enabled policies', async () => {
            await rotationPolicyRepository.getDueForRotation();

            const callArgs = mockFind.mock.calls[0][0];
            expect(callArgs.enabled).toBe(true);
        });

        it('should return empty array when no policies are due', async () => {
            mockFind.mockResolvedValue([]);

            const result = await rotationPolicyRepository.getDueForRotation(new Date());

            expect(result).toEqual([]);
        });

        it('should handle custom date correctly', async () => {
            const customDate = new Date('2025-06-01');
            mockFind.mockResolvedValue([]);

            await rotationPolicyRepository.getDueForRotation(customDate);

            expect(mockFind).toHaveBeenCalledWith({
                nextRotationAt: { $lte: customDate },
                enabled: true
            });
        });
    });

    describe('updateRotationDates', () => {
        it('should normalize domain and update dates with session', async () => {
            const mockSession = { id: 'session123' };
            const dates = {
                domain: '  example  ',
                rotatedAt: new Date('2024-01-01'),
                nextRotationAt: new Date('2024-02-01')
            };

            mockFindOneAndUpdate.mockResolvedValue({ ...dates, domain: 'EXAMPLE' });

            await rotationPolicyRepository.updateRotationDates(dates, mockSession);

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { domain: 'EXAMPLE' },
                { rotatedAt: dates.rotatedAt, nextRotationAt: dates.nextRotationAt },
                { new: true },
                { session: mockSession }
            );
        });

        it('should work without session (undefined)', async () => {
            const dates = {
                domain: 'test',
                rotatedAt: new Date(),
                nextRotationAt: new Date()
            };

            mockFindOneAndUpdate.mockResolvedValue(dates);

            await rotationPolicyRepository.updateRotationDates(dates);

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { domain: 'TEST' },
                { rotatedAt: dates.rotatedAt, nextRotationAt: dates.nextRotationAt },
                { new: true },
                { session: undefined }
            );
        });
    });

    describe('acknowledgeSuccessfulRotation', () => {
        it('should calculate next rotation date from interval', async () => {
            const params = { domain: 'example', intervalDays: 30 };
            mockFindOneAndUpdate.mockResolvedValue({});

            await rotationPolicyRepository.acknowledgeSuccessfulRotation(params);

            const call = mockFindOneAndUpdate.mock.calls[0];
            const updates = call[1];

            // Next rotation should be 30 days after rotatedAt
            const expectedInterval = 30 * 86400000; // 30 days in milliseconds
            const actualInterval = updates.nextRotationAt.getTime() - updates.rotatedAt.getTime();

            expect(actualInterval).toBe(expectedInterval);
        });

        it('should set rotatedAt to current time', async () => {
            const beforeCall = Date.now();
            const params = { domain: 'example', intervalDays: 7 };
            mockFindOneAndUpdate.mockResolvedValue({});

            await rotationPolicyRepository.acknowledgeSuccessfulRotation(params);

            const afterCall = Date.now();
            const call = mockFindOneAndUpdate.mock.calls[0];
            const rotatedAt = call[1].rotatedAt.getTime();

            // rotatedAt should be between before and after
            expect(rotatedAt).toBeGreaterThanOrEqual(beforeCall);
            expect(rotatedAt).toBeLessThanOrEqual(afterCall);
        });

        it('should handle different interval values', async () => {
            const testCases = [
                { intervalDays: 1, expectedMs: 86400000 },
                { intervalDays: 7, expectedMs: 604800000 },
                { intervalDays: 90, expectedMs: 7776000000 }
            ];

            for (const { intervalDays, expectedMs } of testCases) {
                vi.clearAllMocks();
                mockFindOneAndUpdate.mockResolvedValue({});

                await rotationPolicyRepository.acknowledgeSuccessfulRotation({
                    domain: 'test',
                    intervalDays
                });

                const call = mockFindOneAndUpdate.mock.calls[0];
                const updates = call[1];
                const actualInterval = updates.nextRotationAt.getTime() - updates.rotatedAt.getTime();

                expect(actualInterval).toBe(expectedMs);
            }
        });

        it('should pass session to updateRotationDates', async () => {
            const mockSession = { id: 'session456' };
            const params = { domain: 'example', intervalDays: 30 };
            mockFindOneAndUpdate.mockResolvedValue({});

            await rotationPolicyRepository.acknowledgeSuccessfulRotation(params, mockSession);

            const call = mockFindOneAndUpdate.mock.calls[0];
            expect(call[3]).toEqual({ session: mockSession });
        });

        it('should normalize domain before update', async () => {
            const params = { domain: '  MixedCase  ', intervalDays: 30 };
            mockFindOneAndUpdate.mockResolvedValue({});

            await rotationPolicyRepository.acknowledgeSuccessfulRotation(params);

            const call = mockFindOneAndUpdate.mock.calls[0];
            expect(call[0]).toEqual({ domain: 'MIXEDCASE' });
        });
    });

    describe('getSession', () => {
        it('should return database session', async () => {
            const mockSession = { id: 'session789' };
            mockStartSession.mockResolvedValue(mockSession);

            const result = await rotationPolicyRepository.getSession();

            expect(mockStartSession).toHaveBeenCalled();
            expect(result).toEqual(mockSession);
        });

        it('should propagate session creation errors', async () => {
            const error = new Error('Session creation failed');
            mockStartSession.mockRejectedValue(error);

            await expect(rotationPolicyRepository.getSession())
                .rejects.toThrow('Session creation failed');
        });
    });

    describe('singleton instance', () => {
        it('should export singleton instance', () => {
            expect(rotationPolicyRepository).toBeDefined();
            expect(rotationPolicyRepository.model).toBeDefined();
            expect(rotationPolicyRepository.findByDomain).toBeInstanceOf(Function);
        });
    });

    describe('domain normalization consistency', () => {
        it('should normalize domains consistently across all methods', async () => {
            const testDomain = '  Test_Domain  ';
            const expectedDomain = 'TEST_DOMAIN';

            mockFindOne.mockResolvedValue({});
            mockFindOneAndUpdate.mockResolvedValue({});
            mockFindOneAndDelete.mockResolvedValue({});
            mockSave.mockResolvedValue({});

            // Test all methods that accept domain parameter
            await rotationPolicyRepository.findByDomain(testDomain);
            expect(mockFindOne).toHaveBeenCalledWith({ domain: expectedDomain });

            await rotationPolicyRepository.updatePolicy(testDomain, {});
            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { domain: expectedDomain },
                expect.any(Object),
                expect.any(Object)
            );

            await rotationPolicyRepository.deletePolicy(testDomain);
            expect(mockFindOneAndDelete).toHaveBeenCalledWith({ domain: expectedDomain });

            await rotationPolicyRepository.enableRotation(testDomain);
            await rotationPolicyRepository.disableRotation(testDomain);

            // Both enable and disable should use the same normalized domain
            const enableCall = mockFindOneAndUpdate.mock.calls[mockFindOneAndUpdate.mock.calls.length - 2];
            const disableCall = mockFindOneAndUpdate.mock.calls[mockFindOneAndUpdate.mock.calls.length - 1];

            expect(enableCall[0]).toEqual({ domain: expectedDomain });
            expect(disableCall[0]).toEqual({ domain: expectedDomain });
        });
    });
});
