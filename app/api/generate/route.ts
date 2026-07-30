import { GoogleGenAI } from "@google/genai";
import { generationRequestSchema, isBlockedPrompt } from "@/lib/schemas";
import { createAuthenticatedServerClient, readBearerToken } from "@/lib/supabase/server";

export const maxDuration = 300;

const model = process.env.GEMINI_VIDEO_MODEL || "gemini-omni-flash-preview";
const estimatedCostUsd = Number(process.env.OMNI_ESTIMATED_COST_USD || "0.50");
const maxVideoBytes = 50 * 1024 * 1024;

type VideoOutput = { data: string; mimeType: string; interactionId?: string };

function extractVideo(interaction: unknown): VideoOutput | null {
  const value = interaction as {
    id?: string;
    output_video?: { data?: string; mime_type?: string };
    steps?: Array<{
      type?: string;
      content?: Array<{ type?: string; data?: string; mime_type?: string }>;
    }>;
  };
  if (value.output_video?.data) {
    return {
      data: value.output_video.data,
      mimeType: value.output_video.mime_type || "video/mp4",
      interactionId: value.id,
    };
  }
  for (const step of value.steps || []) {
    for (const item of step.content || []) {
      if (item.type === "video" && item.data) {
        return {
          data: item.data,
          mimeType: item.mime_type || "video/mp4",
          interactionId: value.id,
        };
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  const accessToken = readBearerToken(request);
  if (!accessToken) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = generationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "영상 생성 요청 형식이 올바르지 않습니다.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (isBlockedPrompt(parsed.data.prompt)) {
    return Response.json({ error: "안전 정책상 처리할 수 없는 요청입니다." }, { status: 400 });
  }
  if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
    return Response.json({ error: "서버의 비용 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const supabase = createAuthenticatedServerClient(accessToken);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return Response.json({ error: "로그인 세션이 만료되었습니다." }, { status: 401 });
  }

  const { data: job, error: reserveError } = await supabase.rpc("reserve_generation_job", {
    p_project_id: parsed.data.projectId,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_estimated_cost: estimatedCostUsd,
    p_model: model,
    p_prompt: parsed.data.prompt,
    p_aspect_ratio: parsed.data.aspectRatio,
    p_duration_seconds: parsed.data.durationSeconds,
  });
  if (reserveError || !job) {
    return Response.json(
      { error: reserveError?.message || "예산을 예약할 수 없습니다." },
      { status: 409 },
    );
  }

  if (job.status === "completed" && job.output_asset_id) {
    const { data: asset } = await supabase
      .from("assets")
      .select("object_path")
      .eq("id", job.output_asset_id)
      .single();
    if (asset) {
      const { data: signed } = await supabase.storage
        .from("media")
        .createSignedUrl(asset.object_path, 3600);
      return Response.json({ status: "completed", job, videoUrl: signed?.signedUrl });
    }
  }

  if (parsed.data.dryRun || process.env.DRY_RUN === "true") {
    await supabase.rpc("stop_generation_job", {
      p_job_id: job.id,
      p_status: "canceled",
      p_error_message: "DRY_RUN validation only",
    });
    return Response.json({
      status: "validated",
      message: "검증이 완료되었습니다. 유료 API 호출은 실행하지 않았습니다.",
      jobId: job.id,
      provider: "gemini-omni",
      model,
      estimatedCostUsd,
      billableCallMade: false,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await supabase.rpc("stop_generation_job", {
      p_job_id: job.id,
      p_status: "failed",
      p_error_message: "Gemini API key is not configured",
    });
    return Response.json(
      { error: "Gemini API 키가 서버에 설정되지 않았습니다.", jobId: job.id },
      { status: 503 },
    );
  }

  const { error: startError } = await supabase.rpc("start_generation_job", {
    p_job_id: job.id,
  });
  if (startError) return Response.json({ error: startError.message }, { status: 409 });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model,
      input: parsed.data.prompt,
      response_format: { type: "video", aspect_ratio: parsed.data.aspectRatio },
    });
    const video = extractVideo(interaction);
    if (!video) throw new Error("Provider returned no video output");

    const bytes = Buffer.from(video.data, "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > maxVideoBytes) {
      throw new Error("Generated video exceeded the 50 MB storage limit");
    }

    const objectPath = `${authData.user.id}/${parsed.data.projectId}/generated/${job.id}.mp4`;
    const { error: uploadError } = await supabase.storage.from("media").upload(objectPath, bytes, {
      contentType: video.mimeType,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        project_id: parsed.data.projectId,
        user_id: authData.user.id,
        kind: "generated_video",
        object_path: objectPath,
        file_name: `${job.id}.mp4`,
        mime_type: video.mimeType,
        size_bytes: bytes.byteLength,
        license_confirmed: true,
        provenance: {
          provider: "gemini-omni",
          model,
          interaction_id: video.interactionId,
          prompt_version: 1,
          generated_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();
    if (assetError || !asset) throw assetError || new Error("Asset record failed");

    const [finishResult] = await Promise.all([
      supabase.rpc("finish_generation_job", {
        p_job_id: job.id,
        p_asset_id: asset.id,
        p_provider_job_id: video.interactionId || "",
      }),
      supabase.from("projects").update({ status: "review" }).eq("id", parsed.data.projectId),
    ]);
    if (finishResult.error) throw finishResult.error;

    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrl(objectPath, 3600);
    return Response.json({
      status: "completed",
      message: "영상 생성이 완료되었습니다.",
      jobId: job.id,
      provider: "gemini-omni",
      model,
      estimatedCostUsd,
      videoUrl: signed?.signedUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    await supabase.rpc("stop_generation_job", {
      p_job_id: job.id,
      p_status: "failed",
      p_error_message: message,
    });
    return Response.json({ error: "영상 생성에 실패했습니다.", jobId: job.id }, { status: 502 });
  }
}
