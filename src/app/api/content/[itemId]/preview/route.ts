import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/content/[itemId]/preview
 * Proxies to backend content preview endpoint with authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  
  // Get auth token from request cookies
  const token = request.cookies.get("auth_token")?.value;
  
  // Get backend URL from environment or default (includes /api prefix)
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const previewUrl = `${backendUrl}/content/${itemId}/preview`;
  
  try {
    const headers: HeadersInit = {
      "Accept": "text/html",
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(previewUrl, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(errorText, {
        status: response.status,
        headers: { "Content-Type": "text/html" },
      });
    }
    
    const html = await response.text();
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Preview proxy error:", error);
    return new NextResponse(
      `<html><body><h1>Error</h1><p>Failed to load preview</p></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

