type GenerateBody = {
  prompt?: unknown;
  aspectRatio?: unknown;
  durationSeconds?: unknown;
  confirmBillable?: unknown;
  dryRun?: unknown;
};

const model = process.env.GEMINI_VIDEO_MODEL || "gemini-omni-flash-preview";
const maxSingleJob = Number(process.env.MAX_SINGLE_JOB_BUDGET_USD || "0.50");

export async function POST(request: Request) {
  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "올바른 JSON 요청이 아닙니다." }, { status: 400 });
  }

  if (typeof body.prompt !== "string" || body.prompt.length < 10 || body.prompt.length > 4000) {
    return Response.json({ error: "프롬프트는 10~4,000자로 입력하세요." }, { status: 400 });
  }
  if (!["16:9", "9:16"].includes(String(body.aspectRatio))) {
    return Response.json({ error: "Gemini Omni는 16:9와 9:16 생성만 지원합니다." }, { status: 400 });
  }
  const duration = Number(body.durationSeconds || 5);
  if (!Number.isFinite(duration) || duration < 3 || duration > 10) {
    return Response.json({ error: "길이는 3~10초 범위여야 합니다." }, { status: 400 });
  }

  const estimatedMaxUsd = 0.5;
  if (estimatedMaxUsd > maxSingleJob) {
    return Response.json(
      { error: "작업별 예산 상한을 초과했습니다.", estimatedMaxUsd, maxSingleJob },
      { status: 402 },
    );
  }

  if (body.dryRun === true || process.env.DRY_RUN === "true") {
    return Response.json({
      status: "validated",
      provider: "gemini-omni",
      model,
      estimatedMaxUsd,
      billableCallMade: false,
    });
  }

  if (body.confirmBillable !== true) {
    return Response.json(
      { error: "유료 호출에는 명시적 확인이 필요합니다.", estimatedMaxUsd, billableCallMade: false },
      { status: 409 },
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Gemini API 키가 없습니다. 무료·로컬 모드는 계속 사용할 수 있습니다." },
      { status: 503 },
    );
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model,
      input: body.prompt,
      response_format: { type: "video", aspect_ratio: body.aspectRatio },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    return Response.json(
      { error: "제공자 요청에 실패했습니다.", providerStatus: response.status },
      { status: 502 },
    );
  }
  const result = (await response.json()) as Record<string, unknown>;
  return Response.json({
    status: "submitted",
    provider: "gemini-omni",
    model,
    interactionId: result.id,
    billableCallMade: true,
  });
}
