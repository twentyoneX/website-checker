// Cloudflare Worker Code
// File: functions/api/check.js

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  
  // Get the website URL to check from query parameter
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing URL parameter',
        isUp: false,
        statusCode: 0,
        responseTime: 0,
        message: 'No URL provided'
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Add protocol if missing
  const checkUrl = targetUrl.startsWith('http') 
    ? targetUrl 
    : `https://${targetUrl}`;

  try {
    const startTime = Date.now();
    
    // Attempt to fetch the website
    const response = await fetch(checkUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Website Status Checker)',
      },
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Check if site is up based on status code
    const isUp = response.status >= 200 && response.status < 400;

    return new Response(
      JSON.stringify({
        isUp: isUp,
        statusCode: response.status,
        responseTime: responseTime,
        message: isUp 
          ? `Website is accessible (HTTP ${response.status})` 
          : `Website returned error (HTTP ${response.status})`,
        checkedUrl: checkUrl,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    // Handle fetch errors (timeout, DNS failure, etc.)
    return new Response(
      JSON.stringify({
        isUp: false,
        statusCode: 0,
        responseTime: 0,
        message: `Unable to reach website: ${error.message}`,
        error: error.message,
        checkedUrl: checkUrl,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
