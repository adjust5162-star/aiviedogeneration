import { promptRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = promptRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "영상 주제와 화면 비율을 확인해 주세요.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { topic, aspectRatio } = parsed.data;
  const koreanPreview = `${topic}. 동일한 피사체의 얼굴, 의상, 제품 형태와 핵심 색상을 모든 장면에서 유지한다. 사실적인 속도와 물리 표현, 안정적인 카메라 이동, 점진적인 조명 변화로 구성한다. ${aspectRatio} 화면에서 자막을 위한 여백을 확보한다. 갑작스러운 피사체 교체, 중복 신체, 의도하지 않은 글자·로고·워터마크는 금지한다.`;
  const englishPrompt = `Create a polished cinematic video about: ${topic}. Preserve the exact same subject identity, face, wardrobe, product geometry, object count, and key colors throughout every frame. Use realistic speed, physically plausible motion, stable anatomy, natural contact shadows, coherent depth, and controlled camera movement. Transition exposure and color temperature gradually. Compose for ${aspectRatio} with deliberate caption-safe negative space. No duplicate anatomy or objects, sudden subject replacement, flicker, camera shake, texture crawling, unintended text, logos, subtitles, borders, or watermarks.`;

  return Response.json({
    koreanPreview,
    englishPrompt,
    aspectRatio,
    structured: {
      subject_identity: "exactly consistent face, wardrobe, geometry and key colors",
      action: topic,
      composition: `${aspectRatio}, layered depth, caption-safe negative space`,
      camera: "stable, deliberate movement with coherent perspective",
      lighting: "natural contact shadows and gradual exposure transition",
      motion_physics: "realistic speed, weight and physically plausible contact",
      quality: "cinematic detail, temporal consistency, no flicker",
    },
    negativeConstraints: [
      "duplicate anatomy or objects",
      "sudden subject replacement",
      "flicker, camera shake or texture crawling",
      "unintended text, logo or watermark",
      "abrupt exposure or white-balance shift",
    ],
  });
}
