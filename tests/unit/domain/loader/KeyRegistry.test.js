import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyRegistry } from '../../../../src/domain/key-manager/modules/loader/KeyRegistry.js';

describe('KeyRegistry', () => {
    let keyRegistry;
    let mockReader;
    let mockDirectory;

    beforeEach(() => {
        // Create mock KeyReader
        mockReader = {
            publicKey: vi.fn(),
            privateKey: vi.fn()
        };

        // Create mock KeyDirectory
        mockDirectory = {
            listPublicKids: vi.fn(),
            listPrivateKids: vi.fn()
        };

        keyRegistry = new KeyRegistry({
            reader: mockReader,
            directory: mockDirectory
        });
    });

    describe('constructor', () => {
        it('should initialize with injected reader and directory', () => {
            // Test: Verify dependencies are stored
            expect(keyRegistry.reader).toBe(mockReader);
            expect(keyRegistry.directory).toBe(mockDirectory);
        });
    });

    describe('getAllPublicKids', () => {
        it('should delegate to directory to list public KIDs', async () => {
            // Test: Fetch all public key identifiers for a domain
            const domain = 'testdomain';
            const expectedKids = ['kid1', 'kid2', 'kid3'];

            mockDirectory.listPublicKids.mockResolvedValue(expectedKids);

            const kids = await keyRegistry.getAllPublicKids(domain);

            expect(kids).toEqual(expectedKids);
            expect(mockDirectory.listPublicKids).toHaveBeenCalledWith(domain);
        });

        it('should return empty array when no public keys exist', async () => {
            // Test: Handle domain with no public keys
            const domain = 'emptydomain';

            mockDirectory.listPublicKids.mockResolvedValue([]);

            const kids = await keyRegistry.getAllPublicKids(domain);

            expect(kids).toEqual([]);
        });

        it('should handle multiple domains independently', async () => {
            // Test: Different domains return different key lists
            mockDirectory.listPublicKids
                .mockResolvedValueOnce(['domain1-kid1', 'domain1-kid2'])
                .mockResolvedValueOnce(['domain2-kid1']);

            const kids1 = await keyRegistry.getAllPublicKids('domain1');
            const kids2 = await keyRegistry.getAllPublicKids('domain2');

            expect(kids1).toHaveLength(2);
            expect(kids2).toHaveLength(1);
        });
    });

    describe('getAllPrivateKids', () => {
        it('should delegate to directory to list private KIDs', async () => {
            // Test: Fetch all private key identifiers for a domain
            const domain = 'testdomain';
            const expectedKids = ['kid1', 'kid2', 'kid3'];

            mockDirectory.listPrivateKids.mockResolvedValue(expectedKids);

            const kids = await keyRegistry.getAllPrivateKids(domain);

            expect(kids).toEqual(expectedKids);
            expect(mockDirectory.listPrivateKids).toHaveBeenCalledWith(domain);
        });

        it('should return empty array when no private keys exist', async () => {
            // Test: Handle domain with no private keys
            const domain = 'emptydomain';

            mockDirectory.listPrivateKids.mockResolvedValue([]);

            const kids = await keyRegistry.getAllPrivateKids(domain);

            expect(kids).toEqual([]);
        });

        it('should work with different domain names', async () => {
            // Test: Domain-specific private key listing
            const domain = 'anotherdomain';
            mockDirectory.listPrivateKids.mockResolvedValue(['kid-x', 'kid-y']);

            const kids = await keyRegistry.getAllPrivateKids(domain);

            expect(kids).toContain('kid-x');
            expect(kids).toContain('kid-y');
            expect(mockDirectory.listPrivateKids).toHaveBeenCalledWith('anotherdomain');
        });
    });

    describe('getPublicKeyMap', () => {
        it('should build map of KID to public key PEM', async () => {
            // Test: Create KID->PEM mapping for all public keys
            const domain = 'testdomain';
            const kids = ['kid1', 'kid2', 'kid3'];

            mockDirectory.listPublicKids.mockResolvedValue(kids);
            mockReader.publicKey
                .mockResolvedValueOnce('-----BEGIN PUBLIC KEY-----\nkey1\n-----END PUBLIC KEY-----')
                .mockResolvedValueOnce('-----BEGIN PUBLIC KEY-----\nkey2\n-----END PUBLIC KEY-----')
                .mockResolvedValueOnce('-----BEGIN PUBLIC KEY-----\nkey3\n-----END PUBLIC KEY-----');

            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            expect(keyMap).toEqual({
                kid1: '-----BEGIN PUBLIC KEY-----\nkey1\n-----END PUBLIC KEY-----',
                kid2: '-----BEGIN PUBLIC KEY-----\nkey2\n-----END PUBLIC KEY-----',
                kid3: '-----BEGIN PUBLIC KEY-----\nkey3\n-----END PUBLIC KEY-----'
            });
            expect(mockReader.publicKey).toHaveBeenCalledTimes(3);
        });

        it('should return empty object when no public keys exist', async () => {
            // Test: Empty map for domain without public keys
            const domain = 'emptydomain';

            mockDirectory.listPublicKids.mockResolvedValue([]);

            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            expect(keyMap).toEqual({});
            expect(mockReader.publicKey).not.toHaveBeenCalled();
        });

        it('should read each key individually', async () => {
            // Test: Verify each KID is read through reader
            const domain = 'testdomain';
            const kids = ['kid-a', 'kid-b'];

            mockDirectory.listPublicKids.mockResolvedValue(kids);
            mockReader.publicKey.mockResolvedValue('pem-content');

            await keyRegistry.getPublicKeyMap(domain);

            expect(mockReader.publicKey).toHaveBeenCalledWith('kid-a');
            expect(mockReader.publicKey).toHaveBeenCalledWith('kid-b');
        });

        it('should handle reading errors gracefully', async () => {
            // Test: Propagate read errors from reader
            const domain = 'testdomain';

            mockDirectory.listPublicKids.mockResolvedValue(['kid1']);
            mockReader.publicKey.mockRejectedValue(new Error('Read failed'));

            await expect(keyRegistry.getPublicKeyMap(domain))
                .rejects
                .toThrow('Read failed');
        });

        it('should process keys in order', async () => {
            // Test: Sequential processing maintains order
            const domain = 'testdomain';
            const kids = ['kid1', 'kid2', 'kid3'];

            mockDirectory.listPublicKids.mockResolvedValue(kids);
            mockReader.publicKey
                .mockImplementation(kid => Promise.resolve(`pem-for-${kid}`));

            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            expect(Object.keys(keyMap)).toEqual(kids);
        });
    });

    describe('getPrivateKeyMap', () => {
        it('should build map of KID to private key PEM', async () => {
            // Test: Create KID->PEM mapping for all private keys
            const domain = 'testdomain';
            const kids = ['kid1', 'kid2'];

            mockDirectory.listPrivateKids.mockResolvedValue(kids);
            mockReader.privateKey
                .mockResolvedValueOnce('-----BEGIN PRIVATE KEY-----\nkey1\n-----END PRIVATE KEY-----')
                .mockResolvedValueOnce('-----BEGIN PRIVATE KEY-----\nkey2\n-----END PRIVATE KEY-----');

            const keyMap = await keyRegistry.getPrivateKeyMap(domain);

            expect(keyMap).toEqual({
                kid1: '-----BEGIN PRIVATE KEY-----\nkey1\n-----END PRIVATE KEY-----',
                kid2: '-----BEGIN PRIVATE KEY-----\nkey2\n-----END PRIVATE KEY-----'
            });
            expect(mockReader.privateKey).toHaveBeenCalledTimes(2);
        });

        it('should return empty object when no private keys exist', async () => {
            // Test: Empty map for domain without private keys
            const domain = 'emptydomain';

            mockDirectory.listPrivateKids.mockResolvedValue([]);

            const keyMap = await keyRegistry.getPrivateKeyMap(domain);

            expect(keyMap).toEqual({});
            expect(mockReader.privateKey).not.toHaveBeenCalled();
        });

        it('should read each private key individually', async () => {
            // Test: Verify each KID is read through reader
            const domain = 'testdomain';
            const kids = ['kid-x', 'kid-y'];

            mockDirectory.listPrivateKids.mockResolvedValue(kids);
            mockReader.privateKey.mockResolvedValue('pem-content');

            await keyRegistry.getPrivateKeyMap(domain);

            expect(mockReader.privateKey).toHaveBeenCalledWith('kid-x');
            expect(mockReader.privateKey).toHaveBeenCalledWith('kid-y');
        });

        it('should handle single key correctly', async () => {
            // Test: Map with one entry
            const domain = 'testdomain';

            mockDirectory.listPrivateKids.mockResolvedValue(['only-kid']);
            mockReader.privateKey.mockResolvedValue('only-key-pem');

            const keyMap = await keyRegistry.getPrivateKeyMap(domain);

            expect(keyMap).toEqual({
                'only-kid': 'only-key-pem'
            });
        });

        it('should handle reading errors', async () => {
            // Test: Propagate errors from private key reads
            const domain = 'testdomain';

            mockDirectory.listPrivateKids.mockResolvedValue(['kid1']);
            mockReader.privateKey.mockRejectedValue(new Error('File not found'));

            await expect(keyRegistry.getPrivateKeyMap(domain))
                .rejects
                .toThrow('File not found');
        });
    });

    describe('getPublicKey', () => {
        it('should retrieve single public key by KID', async () => {
            // Test: Direct public key retrieval
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const expectedPem = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';

            mockReader.publicKey.mockResolvedValue(expectedPem);

            const pem = await keyRegistry.getPublicKey(kid);

            expect(pem).toBe(expectedPem);
            expect(mockReader.publicKey).toHaveBeenCalledWith(kid);
        });

        it('should delegate directly to reader', async () => {
            // Test: No additional processing, direct delegation
            const kid = 'anykid';
            mockReader.publicKey.mockResolvedValue('any pem');

            await keyRegistry.getPublicKey(kid);

            expect(mockReader.publicKey).toHaveBeenCalledWith(kid);
            expect(mockReader.publicKey).toHaveBeenCalledTimes(1);
        });

        it('should handle read errors', async () => {
            // Test: Propagate reader errors
            const kid = 'invalid-kid';

            mockReader.publicKey.mockRejectedValue(new Error('Key not found'));

            await expect(keyRegistry.getPublicKey(kid))
                .rejects
                .toThrow('Key not found');
        });

        it('should work with different KID formats', async () => {
            // Test: Various KID formats accepted
            const kids = [
                'domain1-20260109-143022-ABCD1234',
                'complex-domain-20260109-143022-ABCD1234',
                'domain_with_underscores-20260109-143022-ABCD1234'
            ];

            mockReader.publicKey.mockResolvedValue('test pem');

            for (const kid of kids) {
                await keyRegistry.getPublicKey(kid);
                expect(mockReader.publicKey).toHaveBeenCalledWith(kid);
            }
        });
    });

    describe('getPrivateKey', () => {
        it('should retrieve single private key by KID', async () => {
            // Test: Direct private key retrieval
            const kid = 'testdomain-20260109-143022-ABCD1234';
            const expectedPem = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

            mockReader.privateKey.mockResolvedValue(expectedPem);

            const pem = await keyRegistry.getPrivateKey(kid);

            expect(pem).toBe(expectedPem);
            expect(mockReader.privateKey).toHaveBeenCalledWith(kid);
        });

        it('should delegate directly to reader', async () => {
            // Test: No additional processing, direct delegation
            const kid = 'somekid';
            mockReader.privateKey.mockResolvedValue('some pem');

            await keyRegistry.getPrivateKey(kid);

            expect(mockReader.privateKey).toHaveBeenCalledWith(kid);
            expect(mockReader.privateKey).toHaveBeenCalledTimes(1);
        });

        it('should handle read errors', async () => {
            // Test: Propagate reader errors for private keys
            const kid = 'missing-kid';

            mockReader.privateKey.mockRejectedValue(new Error('Permission denied'));

            await expect(keyRegistry.getPrivateKey(kid))
                .rejects
                .toThrow('Permission denied');
        });

        it('should work independently from public key reads', async () => {
            // Test: Private key reads don't interfere with public
            const kid = 'testdomain-20260109-143022-ABCD1234';

            mockReader.publicKey.mockResolvedValue('public pem');
            mockReader.privateKey.mockResolvedValue('private pem');

            const pubPem = await keyRegistry.getPublicKey(kid);
            const pvtPem = await keyRegistry.getPrivateKey(kid);

            expect(pubPem).toBe('public pem');
            expect(pvtPem).toBe('private pem');
        });
    });

    describe('integration scenarios', () => {
        it('should coordinate reader and directory for complete workflow', async () => {
            // Test: Full workflow - list KIDs then read keys
            const domain = 'testdomain';

            mockDirectory.listPublicKids.mockResolvedValue(['kid1', 'kid2']);
            mockReader.publicKey.mockResolvedValue('test pem');

            // List kids
            const kids = await keyRegistry.getAllPublicKids(domain);

            // Build map
            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            expect(kids).toHaveLength(2);
            expect(Object.keys(keyMap)).toHaveLength(2);
        });

        it('should handle concurrent operations', async () => {
            // Test: Multiple simultaneous registry operations
            const domain = 'testdomain';

            mockDirectory.listPublicKids.mockResolvedValue(['kid1']);
            mockDirectory.listPrivateKids.mockResolvedValue(['kid1']);
            mockReader.publicKey.mockResolvedValue('public pem');
            mockReader.privateKey.mockResolvedValue('private pem');

            const [pubKids, pvtKids, pubKey, pvtKey] = await Promise.all([
                keyRegistry.getAllPublicKids(domain),
                keyRegistry.getAllPrivateKids(domain),
                keyRegistry.getPublicKey('kid1'),
                keyRegistry.getPrivateKey('kid1')
            ]);

            expect(pubKids).toEqual(['kid1']);
            expect(pvtKids).toEqual(['kid1']);
            expect(pubKey).toBe('public pem');
            expect(pvtKey).toBe('private pem');
        });

        it('should build maps for large key sets efficiently', async () => {
            // Test: Performance with many keys
            const domain = 'testdomain';
            const manyKids = Array.from({ length: 50 }, (_, i) => `kid${i}`);

            mockDirectory.listPublicKids.mockResolvedValue(manyKids);
            mockReader.publicKey.mockImplementation(kid => Promise.resolve(`pem-${kid}`));

            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            expect(Object.keys(keyMap)).toHaveLength(50);
            expect(mockReader.publicKey).toHaveBeenCalledTimes(50);
        });

        it('should maintain consistency between listing and reading', async () => {
            // Test: Same KIDs returned by getAllPublicKids appear in getPublicKeyMap
            const domain = 'testdomain';
            const kids = ['kid1', 'kid2', 'kid3'];

            mockDirectory.listPublicKids.mockResolvedValue(kids);
            mockReader.publicKey.mockResolvedValue('test pem');

            const listedKids = await keyRegistry.getAllPublicKids(domain);
            const keyMap = await keyRegistry.getPublicKeyMap(domain);

            expect(Object.keys(keyMap)).toEqual(listedKids);
        });
    });

    describe('error propagation', () => {
        it('should propagate directory listing errors', async () => {
            // Test: Directory errors bubble up
            const domain = 'testdomain';

            mockDirectory.listPublicKids.mockRejectedValue(new Error('Directory read failed'));

            await expect(keyRegistry.getAllPublicKids(domain))
                .rejects
                .toThrow('Directory read failed');
        });

        it('should propagate reader errors in map building', async () => {
            // Test: Reader errors stop map building
            const domain = 'testdomain';

            mockDirectory.listPublicKids.mockResolvedValue(['kid1', 'kid2']);
            mockReader.publicKey
                .mockResolvedValueOnce('pem1')
                .mockRejectedValueOnce(new Error('Read failed'));

            await expect(keyRegistry.getPublicKeyMap(domain))
                .rejects
                .toThrow('Read failed');
        });
    });
});
