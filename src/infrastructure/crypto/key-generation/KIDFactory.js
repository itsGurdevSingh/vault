export class KIDFactory {
    static generate(domain) {
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const hex = crypto.randomBytes(4).toString('hex');

        return `${domain}-${date}-${time}-${hex}`;
    }
}
