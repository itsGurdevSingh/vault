import { describe, it, expect, beforeEach } from 'vitest';
import { RotationConfig } from '../../../../src/domain/key-manager/config/RotationConfig.js';

describe('RotationConfig', () => {
    describe('constructor', () => {
        it('should create instance with valid state', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                }
            };

            const config = new RotationConfig({ state: mockState });

            expect(config).toBeInstanceOf(RotationConfig);
            expect(config.state).toBe(mockState);
        });

        it('should throw if retryInterval constraints are missing', () => {
            const invalidState = {
                constraints: {
                    maxRetries: { minRetries: 1, maxRetries: 10 }
                }
            };

            expect(() => new RotationConfig({ state: invalidState }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });

        it('should throw if maxRetries constraints are missing', () => {
            const invalidState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 }
                }
            };

            expect(() => new RotationConfig({ state: invalidState }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });

        it('should throw if constraints object is missing', () => {
            const invalidState = {};

            expect(() => new RotationConfig({ state: invalidState }))
                .toThrow("Cannot destructure property 'retryInterval' of 'this.state.constraints' as it is undefined.");
        });

        it('should validate integrity on construction', () => {
            const stateWithFalsyValues = {
                constraints: {
                    retryInterval: 0,
                    maxRetries: null
                }
            };

            expect(() => new RotationConfig({ state: stateWithFalsyValues }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });
    });

    describe('configure', () => {
        let config;
        let mockState;

        beforeEach(() => {
            mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 5000,
                maxRetries: 3
            };
            config = new RotationConfig({ state: mockState });
        });

        it('should update retryIntervalMs via configure', () => {
            config.configure({ retryIntervalMs: 10000 });

            expect(mockState.retryIntervalMs).toBe(10000);
        });

        it('should update maxRetries via configure', () => {
            config.configure({ maxRetries: 7 });

            expect(mockState.maxRetries).toBe(7);
        });

        it('should update both retryIntervalMs and maxRetries', () => {
            config.configure({ retryIntervalMs: 15000, maxRetries: 5 });

            expect(mockState.retryIntervalMs).toBe(15000);
            expect(mockState.maxRetries).toBe(5);
        });

        it('should skip retryIntervalMs if null', () => {
            const originalValue = mockState.retryIntervalMs;
            config.configure({ retryIntervalMs: null, maxRetries: 4 });

            expect(mockState.retryIntervalMs).toBe(originalValue);
            expect(mockState.maxRetries).toBe(4);
        });

        it('should skip maxRetries if null', () => {
            const originalValue = mockState.maxRetries;
            config.configure({ retryIntervalMs: 20000, maxRetries: null });

            expect(mockState.retryIntervalMs).toBe(20000);
            expect(mockState.maxRetries).toBe(originalValue);
        });

        it('should do nothing if both are null', () => {
            const originalInterval = mockState.retryIntervalMs;
            const originalRetries = mockState.maxRetries;

            config.configure({ retryIntervalMs: null, maxRetries: null });

            expect(mockState.retryIntervalMs).toBe(originalInterval);
            expect(mockState.maxRetries).toBe(originalRetries);
        });

        it('should throw if retryIntervalMs is invalid', () => {
            expect(() => config.configure({ retryIntervalMs: 'invalid' }))
                .toThrow('retryIntervalMs must be a number');
        });

        it('should throw if maxRetries is invalid', () => {
            expect(() => config.configure({ maxRetries: 3.5 }))
                .toThrow('maxRetries must be an integer');
        });
    });

    describe('_setRetryInterval', () => {
        let config;
        let mockState;

        beforeEach(() => {
            mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 5000
            };
            config = new RotationConfig({ state: mockState });
        });

        it('should set valid retry interval within range', () => {
            config._setRetryInterval(30000);

            expect(mockState.retryIntervalMs).toBe(30000);
        });

        it('should accept minimum interval value', () => {
            config._setRetryInterval(1000);

            expect(mockState.retryIntervalMs).toBe(1000);
        });

        it('should accept maximum interval value', () => {
            config._setRetryInterval(60000);

            expect(mockState.retryIntervalMs).toBe(60000);
        });

        it('should throw if value is below minimum', () => {
            expect(() => config._setRetryInterval(999))
                .toThrow('retryIntervalMs must be between 1000 and 60000');
        });

        it('should throw if value is above maximum', () => {
            expect(() => config._setRetryInterval(60001))
                .toThrow('retryIntervalMs must be between 1000 and 60000');
        });

        it('should throw if value is not a number', () => {
            expect(() => config._setRetryInterval('5000'))
                .toThrow('retryIntervalMs must be a number');
        });

        it('should silently accept NaN (JS quirk: NaN comparisons are all false)', () => {
            // In JavaScript: typeof NaN === 'number' is true
            // NaN < minInterval is false, NaN > maxInterval is false
            // So NaN passes all checks and gets set
            config._setRetryInterval(NaN);

            expect(mockState.retryIntervalMs).toBeNaN();
        });

        it('should throw if value is Infinity', () => {
            expect(() => config._setRetryInterval(Infinity))
                .toThrow('retryIntervalMs must be between 1000 and 60000');
        });

        it('should accept negative numbers if within constraints', () => {
            mockState.constraints.retryInterval = { minInterval: -1000, maxInterval: 1000 };
            config._setRetryInterval(-500);

            expect(mockState.retryIntervalMs).toBe(-500);
        });

        it('should accept float numbers', () => {
            config._setRetryInterval(5000.5);

            expect(mockState.retryIntervalMs).toBe(5000.5);
        });

        it('should accept zero if within constraints', () => {
            mockState.constraints.retryInterval = { minInterval: 0, maxInterval: 10000 };
            config._setRetryInterval(0);

            expect(mockState.retryIntervalMs).toBe(0);
        });
    });

    describe('_setMaxRetries', () => {
        let config;
        let mockState;

        beforeEach(() => {
            mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                maxRetries: 3
            };
            config = new RotationConfig({ state: mockState });
        });

        it('should set valid maxRetries within range', () => {
            config._setMaxRetries(5);

            expect(mockState.maxRetries).toBe(5);
        });

        it('should accept minimum retries value', () => {
            config._setMaxRetries(1);

            expect(mockState.maxRetries).toBe(1);
        });

        it('should accept maximum retries value', () => {
            config._setMaxRetries(10);

            expect(mockState.maxRetries).toBe(10);
        });

        it('should throw if value is below minimum', () => {
            expect(() => config._setMaxRetries(0))
                .toThrow('maxRetries must be between 1 and 10');
        });

        it('should throw if value is above maximum', () => {
            expect(() => config._setMaxRetries(11))
                .toThrow('maxRetries must be between 1 and 10');
        });

        it('should throw if value is not an integer', () => {
            expect(() => config._setMaxRetries(3.5))
                .toThrow('maxRetries must be an integer');
        });

        it('should throw if value is a string', () => {
            expect(() => config._setMaxRetries('5'))
                .toThrow('maxRetries must be an integer');
        });

        it('should throw if value is NaN', () => {
            expect(() => config._setMaxRetries(NaN))
                .toThrow('maxRetries must be an integer');
        });

        it('should throw if value is Infinity', () => {
            expect(() => config._setMaxRetries(Infinity))
                .toThrow('maxRetries must be an integer');
        });

        it('should accept negative integers if within constraints', () => {
            mockState.constraints.maxRetries = { minRetries: -5, maxRetries: 5 };
            config._setMaxRetries(-3);

            expect(mockState.maxRetries).toBe(-3);
        });

        it('should accept zero if within constraints', () => {
            mockState.constraints.maxRetries = { minRetries: 0, maxRetries: 10 };
            config._setMaxRetries(0);

            expect(mockState.maxRetries).toBe(0);
        });
    });

    describe('_validateIntegrity', () => {
        it('should pass with valid constraints', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                }
            };

            expect(() => new RotationConfig({ state: mockState }))
                .not.toThrow();
        });

        it('should throw if retryInterval is null', () => {
            const mockState = {
                constraints: {
                    retryInterval: null,
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                }
            };

            expect(() => new RotationConfig({ state: mockState }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });

        it('should throw if maxRetries is undefined', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: undefined,
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                }
            };

            expect(() => new RotationConfig({ state: mockState }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });

        it('should throw if retryInterval is 0 (falsy)', () => {
            const mockState = {
                constraints: {
                    retryInterval: 0,
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                }
            };

            expect(() => new RotationConfig({ state: mockState }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });

        it('should throw if maxRetries is empty string (falsy)', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: '',
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                }
            };

            expect(() => new RotationConfig({ state: mockState }))
                .toThrow('RotationConfigManager: Constraints are not properly set.');
        });
    });

    describe('state mutation', () => {
        it('should mutate shared state object', () => {
            const sharedState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 5000,
                maxRetries: 3
            };

            const config = new RotationConfig({ state: sharedState });
            config.configure({ retryIntervalMs: 12000, maxRetries: 8 });

            // Verify the original object was mutated
            expect(sharedState.retryIntervalMs).toBe(12000);
            expect(sharedState.maxRetries).toBe(8);
        });

        it('should reflect changes across multiple config instances sharing state', () => {
            const sharedState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 5000,
                maxRetries: 3
            };

            const config1 = new RotationConfig({ state: sharedState });
            const config2 = new RotationConfig({ state: sharedState });

            config1.configure({ retryIntervalMs: 15000 });

            // Both instances should see the change
            expect(config1.state.retryIntervalMs).toBe(15000);
            expect(config2.state.retryIntervalMs).toBe(15000);
        });
    });

    describe('integration scenarios', () => {
        it('should handle multiple configure calls', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 5000,
                maxRetries: 3
            };
            const config = new RotationConfig({ state: mockState });

            config.configure({ retryIntervalMs: 10000 });
            config.configure({ maxRetries: 5 });
            config.configure({ retryIntervalMs: 20000, maxRetries: 7 });

            expect(mockState.retryIntervalMs).toBe(20000);
            expect(mockState.maxRetries).toBe(7);
        });

        it('should enforce constraints across multiple updates', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 1000, maxInterval: 60000 },
                    maxRetries: { minRetries: 1, maxRetries: 10 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 5000,
                maxRetries: 3
            };
            const config = new RotationConfig({ state: mockState });

            config.configure({ retryIntervalMs: 30000, maxRetries: 5 });

            expect(() => config.configure({ retryIntervalMs: 999 }))
                .toThrow('retryIntervalMs must be between 1000 and 60000');

            expect(() => config.configure({ maxRetries: 11 }))
                .toThrow('maxRetries must be between 1 and 10');

            // Previous valid values should remain
            expect(mockState.retryIntervalMs).toBe(30000);
            expect(mockState.maxRetries).toBe(5);
        });

        it('should work with dynamic constraint ranges', () => {
            const mockState = {
                constraints: {
                    retryInterval: { minInterval: 5000, maxInterval: 30000 },
                    maxRetries: { minRetries: 2, maxRetries: 5 },
                    rotationInterval: { minInterval: 1, maxInterval: 365 }
                },
                retryIntervalMs: 10000,
                maxRetries: 3
            };
            const config = new RotationConfig({ state: mockState });

            config.configure({ retryIntervalMs: 15000, maxRetries: 4 });

            expect(mockState.retryIntervalMs).toBe(15000);
            expect(mockState.maxRetries).toBe(4);

            // Change constraints mid-flight
            mockState.constraints.retryInterval = { minInterval: 1000, maxInterval: 20000 };
            mockState.constraints.maxRetries = { minRetries: 1, maxRetries: 3 };

            config.configure({ retryIntervalMs: 5000, maxRetries: 2 });

            expect(mockState.retryIntervalMs).toBe(5000);
            expect(mockState.maxRetries).toBe(2);
        });
    });
});
