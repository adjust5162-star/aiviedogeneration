const MAX_TOPIC_LENGTH = 500;

export async function POST(request: Request) {
  let body: { topic?: unknown; aspectRatio?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "올바른 JSON 요청이 아닙니다." }, { status: 400 });
  }

  if (typeof body.topic !== "string" || !body.topic.trim() || body.topic.length > MAX_TOPIC_LENGTH) {
    return Response.json({ error: "주제는 1~500자로 입력하세요." }, { status: 400 });
  }
  if (!["16:9", "9:16", "1:1"].includes(String(body.aspectRatio))) {
    return Response.json({ error: "지원하지 않는 화면 비율입니다." }, { status: 400 });
  }

  const subject = body.topic.trim();
  const english = `A cinematic short-form video about ${subject}. Preserve subject identity, wardrobe, face, product geometry and key colors. Use realistic motion, stable anatomy, controlled camera movement and gradual lighting changes. Leave caption-safe negative space. No duplicate limbs, sudden subject replacement, unintended text, logo, border or watermark.`;

  return Response.json({
    koreanPreview: `${subject}. 인물·의상·색상을 유지하고 사실적인 움직임과 안정된 카메라로 표현합니다.`,
    englishPrompt: english,
    aspectRatio: body.aspectRatio,
    negativeConstraints: [
      "duplicate anatomy or objects",
      "sudden subject replacement",
      "camera shake",
      "unintended text, logo or watermark",
      "abrupt exposure or white-balance shift",
    ],
  });
}
