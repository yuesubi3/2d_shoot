export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API ルーティング
    if (url.pathname === "/api/match" && request.method === "POST") {
      return handleMatch(request, env);
    }
    if (url.pathname === "/api/cancel" && request.method === "POST") {
      return handleCancel(request, env);
    }

    // その他は静的アセットを配信
    return env.ASSETS.fetch(request);
  },
};

async function handleMatch(request, env) {
  let peerId;
  try {
    const body = await request.json();
    peerId = body.peerId;
    if (!peerId || typeof peerId !== "string") {
      return new Response(JSON.stringify({ error: "peerId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 待機中のプレイヤーを取得
  const waitingPeerId = await env.MATCH_KV.get("waiting_player");

  if (waitingPeerId) {
    // 待機中のプレイヤーがいる → マッチ成立
    // 待機側をホスト（プレイヤー1）にするため、待機側の peerId を targetId として返す
    await env.MATCH_KV.delete("waiting_player");
    return new Response(
      JSON.stringify({ status: "matched", targetId: waitingPeerId }),
      { headers: { "Content-Type": "application/json" } }
    );
  } else {
    // 待機中のプレイヤーがいない → 自分が待機
    await env.MATCH_KV.put("waiting_player", peerId, { expirationTtl: 60 });
    return new Response(JSON.stringify({ status: "waiting" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleCancel(request, env) {
  let peerId;
  try {
    const body = await request.json();
    peerId = body.peerId;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const waitingPeerId = await env.MATCH_KV.get("waiting_player");
  if (waitingPeerId && waitingPeerId === peerId) {
    await env.MATCH_KV.delete("waiting_player");
  }

  return new Response(JSON.stringify({ status: "cancelled" }), {
    headers: { "Content-Type": "application/json" },
  });
}