export function pemToArrayBuffer(pem) {
    const b64 = pem
        .replace(/-----BEGIN [\w\s]+-----/, "")
        .replace(/-----END [\w\s]+-----/, "")
        .replace(/\s+/g, "");

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

export function base64UrlEncode(bytes) {
    let binary = "";
    bytes.forEach(b => binary += String.fromCharCode(b));

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
