export default async function handler(req, res) {
  // 允许GET和POST请求
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header' 
      });
    }

    const accessToken = authHeader.substring(7);
    console.log('LinuxDO userinfo request with token:', accessToken.substring(0, 10) + '...');

    // 尝试多种不同的API端点
    const apiEndpoints = [
      'https://connect.linux.do/oauth2/userinfo',
      'https://connect.linux.do/api/user',
      'https://connect.linux.do/me',
      'https://connect.linux.do/user/me',
      'https://connect.linux.do/oauth2/me'
    ];

    const requestMethods = [
      // GET with Bearer token
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'PaymentsMaps/1.0.0'
        }
      },
      // POST with Bearer token
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'PaymentsMaps/1.0.0'
        },
        body: JSON.stringify({})
      }
    ];

    let lastError = null;
    
    // 尝试每个端点的每种方法
    for (let endpointIndex = 0; endpointIndex < apiEndpoints.length; endpointIndex++) {
      const endpoint = apiEndpoints[endpointIndex];
      console.log(`尝试端点 ${endpointIndex + 1}: ${endpoint}`);

      for (let methodIndex = 0; methodIndex < requestMethods.length; methodIndex++) {
        const requestConfig = requestMethods[methodIndex];
        
        try {
          console.log(`端点 ${endpointIndex + 1}, 方法 ${methodIndex + 1}: ${requestConfig.method}`);
          
          const userResponse = await fetch(endpoint, requestConfig);
          
          console.log(`端点 ${endpointIndex + 1}, 方法 ${methodIndex + 1} 响应状态:`, userResponse.status);
          console.log(`端点 ${endpointIndex + 1}, 方法 ${methodIndex + 1} 响应头:`, Object.fromEntries(userResponse.headers.entries()));

          const responseText = await userResponse.text();
          console.log(`端点 ${endpointIndex + 1}, 方法 ${methodIndex + 1} 响应体:`, responseText);

          if (userResponse.ok) {
            try {
              const userData = JSON.parse(responseText);
              console.log('成功获取用户数据:', userData);
              return res.status(200).json(userData);
            } catch (parseError) {
              console.error('解析成功响应失败:', parseError);
              // 如果无法解析JSON，但响应成功，可能是HTML或其他格式
              if (responseText && responseText.trim()) {
                return res.status(200).json({ 
                  raw_response: responseText,
                  endpoint_used: endpoint,
                  method_used: requestConfig.method
                });
              }
            }
          } else if (userResponse.status !== 403 && userResponse.status !== 404) {
            // 如果不是403或404错误，记录但继续尝试其他端点
            lastError = { 
              endpoint,
              method: requestConfig.method,
              status: userResponse.status, 
              body: responseText 
            };
          }
        } catch (fetchError) {
          console.error(`端点 ${endpointIndex + 1}, 方法 ${methodIndex + 1} 网络错误:`, fetchError.message);
          lastError = { 
            endpoint,
            method: requestConfig.method,
            error: fetchError.message 
          };
        }
      }

      // 尝试第三种方式：作为URL参数，只对第一个端点
      if (endpointIndex === 0) {
        try {
          console.log(`端点 ${endpointIndex + 1}, 方法 3: URL参数`);
          const urlWithToken = `${endpoint}?access_token=${accessToken}`;
          const userResponse = await fetch(urlWithToken, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'PaymentsMaps/1.0.0'
            }
          });
          
          console.log(`端点 ${endpointIndex + 1}, 方法 3 响应状态:`, userResponse.status);
          const responseText = await userResponse.text();
          console.log(`端点 ${endpointIndex + 1}, 方法 3 响应体:`, responseText);

          if (userResponse.ok) {
            try {
              const userData = JSON.parse(responseText);
              console.log('URL参数方法成功获取用户数据:', userData);
              return res.status(200).json(userData);
            } catch (parseError) {
              console.error('URL参数方法解析响应失败:', parseError);
              if (responseText && responseText.trim()) {
                return res.status(200).json({ 
                  raw_response: responseText,
                  endpoint_used: endpoint,
                  method_used: 'GET with URL param'
                });
              }
            }
          }
        } catch (fetchError) {
          console.error(`端点 ${endpointIndex + 1}, 方法 3 网络错误:`, fetchError.message);
        }
      }
    }

    // 所有方法和端点都失败了
    console.error('所有API端点和方法都失败了');
    return res.status(403).json({ 
      error: 'Failed to get user info',
      details: 'All API endpoints and methods failed',
      lastError: lastError,
      attempted_endpoints: apiEndpoints
    });

  } catch (error) {
    console.error('Userinfo proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}