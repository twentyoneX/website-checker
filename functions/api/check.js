// A list of locations to test from.
// In a real-world scenario, you might have workers deployed in these regions.
// Here, we simulate by having one worker perform all checks.
const LOCATIONS = [
    { name: 'Singapore (ASIA PACIFIC)', city: 'SIN' },
    { name: 'Oregon (US WEST)', city: 'PDX' },
    { name: 'N. Virginia (US EAST)', city: 'IAD' },
    { name: 'Ireland (EU WEST)', city: 'DUB' },
    { name: 'Sao Paulo (SA EAST)', city: 'GRU' },
];

/**
 * Cloudflare Worker handler
 */
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'URL parameter is missing' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Ensure the URL has a protocol
    const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

    try {
        const promises = LOCATIONS.map(location => checkUrl(fullUrl, location.name));
        const results = await Promise.all(promises);

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Optional: for local testing
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to check URL', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/**
 * Performs a fetch request and measures the response time.
 * @param {string} url - The URL to check.
 * @param {string} location - The name of the location checking.
 * @returns {object} - An object with timing details.
 */
async function checkUrl(url, location) {
    const start = performance.now();
    try {
        // We use { method: 'HEAD' } to be faster and use less data, as we only care about the connection and headers.
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        const end = performance.now();
        const total = Math.round(end - start);
        
        // IMPORTANT: The standard fetch API does NOT provide a breakdown of DNS, TCP, and TLS times.
        // We are simulating this breakdown based on typical percentages for demonstration purposes.
        const timing = simulateTimingBreakdown(total);

        return {
            location,
            status: response.status,
            total,
            ...timing,
        };
    } catch (error) {
        // If the fetch fails, it's considered "down" from this location.
        return {
            location,
            status: 'Error',
            total: 0,
            dns: 0,
            tcp: 0,
            tls: 0,
            firstByte: 0,
        };
    }
}

/**
 * Simulates the timing breakdown for DNS, TCP, TLS, and TTFB.
 * @param {number} totalTime - The total response time in ms.
 * @returns {object} - An object with simulated breakdown times.
 */
function simulateTimingBreakdown(totalTime) {
    // These percentages are arbitrary for visual effect.
    const dnsPercentage = 0.10;  // 10%
    const tcpPercentage = 0.15;  // 15%
    const tlsPercentage = 0.20;  // 20%

    let dns = Math.round(totalTime * dnsPercentage);
    let tcp = Math.round(totalTime * tcpPercentage);
    let tls = Math.round(totalTime * tlsPercentage);

    // The rest is the time to first byte
    let firstByte = totalTime - dns - tcp - tls;
    
    // Ensure nothing is negative if totalTime is very small
    if (firstByte < 0) {
        firstByte = 0;
    }

    return { dns, tcp, tls, firstByte };
}
