import { NextResponse } from 'next/server';

/**
 * 获取 API 基础 URL
 */
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'https://seenos.seokit.tech/api';
}

/**
 * 将 OAuth 授权码交换为访问令牌
 * 调用后端 API: POST /api/auth/oauth/gsc/exchange
 */
async function exchangeCodeForTokens(code: string, state: string): Promise<{
  success: boolean;
  projectId: string;
  sites: string[];
  matchedSite: string;
  hasMatchingSite: boolean;
  projectDomain: string;
  message: string;
}> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/auth/oauth/gsc/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[GSC] Failed to exchange code for tokens:', error);
    throw new Error(`Failed to exchange code for tokens: ${error.message || 'Unknown error'}`);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json({ error: `Google OAuth error: ${error}` }, { status: 400 });
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Decode state
    const { userId, conversationId } = JSON.parse(Buffer.from(state, 'base64').toString());

    if (!userId) {
      return NextResponse.json({ error: 'Invalid state: missing userId' }, { status: 400 });
    }

    // Exchange code for tokens (后端会处理 token 交换和站点获取)
    const result = await exchangeCodeForTokens(code, state);

    // 记录成功信息
    console.log('[GSC] Authorization completed:', {
      success: result.success,
      projectId: result.projectId,
      sitesCount: result.sites.length,
      hasMatchingSite: result.hasMatchingSite,
      matchedSite: result.matchedSite,
      projectDomain: result.projectDomain,
      message: result.message,
    });

    // Redirect back to the app (chat page)
    const redirectUrl = new URL('/', req.url);
    if (conversationId) redirectUrl.searchParams.set('c', conversationId);
    redirectUrl.searchParams.set('gsc_success', 'true');
    if (result.hasMatchingSite) {
      redirectUrl.searchParams.set('gsc_matched', 'true');
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[GSC Callback] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to complete GSC authorization',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

