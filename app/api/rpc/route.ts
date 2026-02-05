import { NextRequest, NextResponse } from "next/server";

const GENLAYER_RPC_URL = "https://studio.genlayer.com/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[RPC Proxy] Request:", JSON.stringify(body, null, 2));

    const response = await fetch(GENLAYER_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log("[RPC Proxy] Response status:", response.status);
    console.log("[RPC Proxy] Response:", responseText.substring(0, 500));

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[RPC Proxy] Failed to parse response as JSON");
      return NextResponse.json(
        { error: "Invalid JSON response from GenLayer RPC", raw: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[RPC Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to GenLayer RPC", details: String(error) },
      { status: 500 }
    );
  }
}
