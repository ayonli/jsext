/**
 * Retrieves the public IP address of the current machine.
 * 
 * @see https://checkip.amazonaws.com
 */
export async function getInternetIp(): Promise<string> {
    const res = await fetch("https://checkip.amazonaws.com");
    if (res.ok) {
        const text = await res.text();
        const match = text.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        if (match) {
            return match[0];
        } else {
            throw new Error("Failed to parse IP address from response");
        }
    } else {
        throw new Error(`Failed to fetch IP address: ${res.status} ${res.statusText}`);
    }
}
