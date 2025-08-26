export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, clientId, clientSecret, redirectUri } = req.body;

    // 验证必需参数
    if (!code || !clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code, clientId, clientSecret, redirectUri' 
      });
    }

    console.log('LinuxDO token request:', { 
      code: code.substring(0, 10) + '...',
      clientId,
      redirectUri
    });

    // 向 LinuxDO API 发送请求
    const tokenResponse = await fetch('https://connect.linux.do/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'PaymentsMaps/1.0.0'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    console.log('LinuxDO token response status:', tokenResponse.status);
    console.log('LinuxDO token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    const responseText = await tokenResponse.text();
    console.log('LinuxDO token response body:', responseText);

    if (!tokenResponse.ok) {
      console.error('LinuxDO token error:', tokenResponse.status, responseText);
      return res.status(tokenResponse.status).json({ 
        error: 'Failed to get access token',
        details: responseText,
        linuxdo_status: tokenResponse.status
      });
    }

    // 解析并返回响应
    try {
      const tokenData = JSON.parse(responseText);
      console.log('Token data received:', {
        ...tokenData,
        access_token: tokenData.access_token ? tokenData.access_token.substring(0, 10) + '...' : 'none'
      });
      return res.status(200).json(tokenData);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(500).json({ 
        error: 'Invalid response format',
        details: responseText
      });
    }

  } catch (error) {
    console.error('Token proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}