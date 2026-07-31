"use client";

import type { Session } from "@supabase/supabase-js";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Ratio = "16:9" | "9:16";
type PromptResult = {
  koreanPreview: string;
  englishPrompt: string;
  structured: Record<string, unknown>;
  negativeConstraints: string[];
};
type Project = {
  id: string;
  title: string;
  topic: string;
  aspect_ratio: Ratio;
  duration_seconds: number;
  status: string;
  updated_at: string;
  prompt_ko?: string | null;
  prompt_en?: string | null;
};

const supabase = getSupabaseBrowserClient();

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("나의 첫 AI 영상");
  const [topic, setTopic] = useState("새벽 도시를 달리는 러너의 8초 시네마틱 브랜드 영상");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [duration, setDuration] = useState(8);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState<PromptResult | null>(null);
  const [activePrompt, setActivePrompt] = useState<"ko" | "en" | "json">("en");
  const [paidEnabled, setPaidEnabled] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(2);
  const [singleBudget, setSingleBudget] = useState(0.5);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState(
    supabase ? "서비스 연결을 확인하는 중입니다." : "Supabase 환경 변수가 아직 설정되지 않았습니다.",
  );
  const [busy, setBusy] = useState("");

  const promptText = useMemo(() => {
    if (!prompt) return "프롬프트를 생성하면 여기에 표시됩니다.";
    if (activePrompt === "ko") return prompt.koreanPreview;
    if (activePrompt === "json") return JSON.stringify(prompt.structured, null, 2);
    return prompt.englishPrompt;
  }, [activePrompt, prompt]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !session) return;
    const [projectResult, settingsResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id,title,topic,aspect_ratio,duration_seconds,status,updated_at,prompt_ko,prompt_en")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("user_settings")
        .select("paid_generation_enabled,max_daily_budget_usd,max_single_job_budget_usd")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);
    if (projectResult.error) {
      setStatus(`프로젝트 로드 실패: ${projectResult.error.message}`);
      return;
    }
    setProjects((projectResult.data ?? []) as Project[]);
    if (settingsResult.data) {
      setPaidEnabled(Boolean(settingsResult.data.paid_generation_enabled));
      setDailyBudget(Number(settingsResult.data.max_daily_budget_usd));
      setSingleBudget(Number(settingsResult.data.max_single_job_budget_usd));
    }
    setStatus("작업 공간이 안전하게 동기화되었습니다.");
  }, [session]);

  useEffect(() => {
    if (!session || !supabase) return;
    // The authenticated session is the external source that triggers workspace hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace();
  }, [session, loadWorkspace]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setStatus("Supabase 연결 설정이 필요합니다.");
    setBusy("auth");
    try {
      const result =
        authMode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      setStatus(
        authMode === "signup" && !result.data.session
          ? "가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 주세요."
          : "로그인되었습니다.",
      );
    } catch (error) {
      setStatus(messageOf(error));
    } finally {
      setBusy("");
    }
  }

  async function saveProject() {
    if (!supabase || !session) return setStatus("먼저 로그인해 주세요.");
    setBusy("save");
    try {
      const payload = {
        user_id: session.user.id,
        title: title.trim(),
        topic: topic.trim(),
        mode: "google",
        platform: ratio === "9:16" ? "shorts" : "youtube",
        aspect_ratio: ratio,
        duration_seconds: duration,
        visual_style: "cinematic",
        status: "draft",
        prompt_ko: prompt?.koreanPreview ?? null,
        prompt_en: prompt?.englishPrompt ?? null,
        prompt_json: prompt?.structured ?? {},
      };
      const query = projectId
        ? supabase.from("projects").update(payload).eq("id", projectId)
        : supabase.from("projects").insert(payload);
      const { data, error } = await query.select("id").single();
      if (error) throw error;
      setProjectId(data.id);
      await loadWorkspace();
      setStatus("프로젝트가 Supabase에 저장되었습니다.");
    } catch (error) {
      setStatus(messageOf(error));
    } finally {
      setBusy("");
    }
  }

  async function createPrompt() {
    setBusy("prompt");
    try {
      const response = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, aspectRatio: ratio }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "프롬프트 생성에 실패했습니다.");
      setPrompt(data);
      setActivePrompt("en");
      setStatus("일관성과 영상 안정성을 강화한 프롬프트를 만들었습니다.");
    } catch (error) {
      setStatus(messageOf(error));
    } finally {
      setBusy("");
    }
  }

  async function saveSettings() {
    if (!supabase || !session) return setStatus("먼저 로그인해 주세요.");
    setBusy("settings");
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: session.user.id,
        paid_generation_enabled: paidEnabled,
        max_daily_budget_usd: dailyBudget,
        max_single_job_budget_usd: singleBudget,
      });
      if (error) throw error;
      setStatus("유료 생성 권한과 예산 한도를 저장했습니다.");
    } catch (error) {
      setStatus(messageOf(error));
    } finally {
      setBusy("");
    }
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!supabase || !session) return setStatus("먼저 로그인해 주세요.");
    if (!rightsConfirmed) return setStatus("업로드할 파일의 사용 권리를 먼저 확인해 주세요.");
    if (file.size > 50 * 1024 * 1024) return setStatus("파일 크기는 50MB 이하여야 합니다.");
    setBusy("upload");
    try {
      const targetProjectId = projectId;
      if (!targetProjectId) {
        await saveProject();
        setStatus("프로젝트를 만든 뒤 파일을 다시 선택해 주세요.");
        return;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${session.user.id}/${targetProjectId}/references/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: assetError } = await supabase.from("assets").insert({
        project_id: targetProjectId,
        user_id: session.user.id,
        kind: file.type.startsWith("video/") ? "source_video" : "reference_image",
        bucket_id: "media",
        object_path: objectPath,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        license_confirmed: true,
        provenance: { source: "user_upload", uploaded_at: new Date().toISOString() },
      });
      if (assetError) {
        await supabase.storage.from("media").remove([objectPath]);
        throw assetError;
      }
      setAssetName(file.name);
      setStatus("참고 자료를 비공개 저장소에 업로드했습니다.");
    } catch (error) {
      setStatus(messageOf(error));
    } finally {
      setBusy("");
    }
  }

  async function generateVideo() {
    if (!supabase || !session) return setStatus("먼저 로그인해 주세요.");
    if (!projectId) return setStatus("먼저 프로젝트를 저장해 주세요.");
    if (!prompt?.englishPrompt) return setStatus("먼저 프롬프트를 생성해 주세요.");
    if (!paidEnabled) return setStatus("예산 설정에서 유료 생성을 허용하고 저장해 주세요.");
    const approved = window.confirm(
      `Gemini 영상 생성 API를 호출합니다. 이 작업의 예상 비용 한도는 $${singleBudget.toFixed(2)}이며 실제 비용이 발생할 수 있습니다. 계속할까요?`,
    );
    if (!approved) return;
    setBusy("generate");
    setVideoUrl("");
    setStatus("영상 생성 요청을 전송했습니다. 모델 처리에는 몇 분이 걸릴 수 있습니다.");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          prompt: prompt.englishPrompt,
          aspectRatio: ratio,
          durationSeconds: duration,
          idempotencyKey: crypto.randomUUID(),
          confirmBillable: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "영상 생성에 실패했습니다.");
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      setStatus(data.message ?? "영상 생성이 완료되었습니다.");
      await loadWorkspace();
    } catch (error) {
      setStatus(messageOf(error));
    } finally {
      setBusy("");
    }
  }

  function selectProject(project: Project) {
    setProjectId(project.id);
    setTitle(project.title);
    setTopic(project.topic);
    setRatio(project.aspect_ratio);
    setDuration(Math.min(10, project.duration_seconds));
    if (project.prompt_en) {
      setPrompt({
        koreanPreview: project.prompt_ko ?? "",
        englishPrompt: project.prompt_en,
        structured: {},
        negativeConstraints: [],
      });
    } else {
      setPrompt(null);
    }
    setVideoUrl("");
    setStatus(`“${project.title}” 프로젝트를 열었습니다.`);
  }

  if (!authReady) return <main className="loading-screen">AI Video Studio를 준비하는 중…</main>;

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-hero">
          <div className="logo"><span>AV</span> AI VIDEO STUDIO</div>
          <p className="kicker">IDEA TO MOTION</p>
          <h1>아이디어를<br /><em>움직이는 장면</em>으로.</h1>
          <p className="hero-copy">
            프롬프트 설계, 참고 자료, 예산 통제, 생성 결과를 한곳에서 안전하게 관리하세요.
          </p>
          <div className="feature-row">
            <span>일관성 강화 프롬프트</span><span>비공개 에셋</span><span>예산 보호</span>
          </div>
        </section>
        <form className="auth-card" onSubmit={authenticate}>
          <p className="kicker">SECURE WORKSPACE</p>
          <h2>{authMode === "signin" ? "다시 만나 반가워요" : "새 작업 공간 만들기"}</h2>
          <p>프로젝트와 생성 결과는 계정별로 분리되어 저장됩니다.</p>
          {!supabase && <div className="error-box">배포 환경에 Supabase 공개 키를 설정해 주세요.</div>}
          <label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>비밀번호<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="primary wide" disabled={busy === "auth" || !supabase}>
            {busy === "auth" ? "처리 중…" : authMode === "signin" ? "로그인" : "무료로 가입"}
          </button>
          <button type="button" className="text-link" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>
            {authMode === "signin" ? "계정이 없나요? 가입하기" : "이미 계정이 있나요? 로그인"}
          </button>
          <div className="status-line" role="status">{status}</div>
        </form>
      </main>
    );
  }

  return (
    <main className="studio">
      <aside className="sidebar">
        <div className="logo"><span>AV</span> AI VIDEO STUDIO</div>
        <button className="new-project" onClick={() => {
          setProjectId(null); setTitle("새 AI 영상"); setTopic(""); setPrompt(null); setVideoUrl("");
          setStatus("새 프로젝트를 시작합니다.");
        }}>＋ 새 프로젝트</button>
        <div className="project-list">
          <p className="side-label">최근 프로젝트</p>
          {projects.length === 0 && <small>저장된 프로젝트가 없습니다.</small>}
          {projects.map((project) => (
            <button key={project.id} className={projectId === project.id ? "project active" : "project"} onClick={() => selectProject(project)}>
              <b>{project.title}</b>
              <span>{project.aspect_ratio} · {new Date(project.updated_at).toLocaleDateString("ko-KR")}</span>
            </button>
          ))}
        </div>
        <div className="account">
          <div className="avatar">{session.user.email?.slice(0, 1).toUpperCase()}</div>
          <div><b>{session.user.email}</b><span>Supabase로 보호됨</span></div>
          <button aria-label="로그아웃" onClick={() => void supabase?.auth.signOut()}>↗</button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div><p className="kicker">PRODUCTION WORKSPACE</p><h1>{title}</h1></div>
          <div className="top-actions">
            <span className="save-state">{projectId ? "● 클라우드 저장됨" : "○ 저장 전"}</span>
            <button className="secondary" onClick={saveProject} disabled={!!busy}>{busy === "save" ? "저장 중…" : "프로젝트 저장"}</button>
          </div>
        </header>

        <div className="dashboard">
          <section className="composer card">
            <div className="section-title"><span>01</span><div><h2>장면의 핵심을 알려주세요</h2><p>구체적인 인물, 행동, 공간, 분위기를 적을수록 결과가 좋아집니다.</p></div></div>
            <label className="field">프로젝트 이름<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
            <label className="field">영상 아이디어<textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={500} rows={5} placeholder="예: 새벽 한강을 달리는 러너, 차가운 블루 톤에서 따뜻한 일출로 전환" /></label>
            <div className="field-grid">
              <div className="field"><span>화면 비율</span><div className="segmented">
                {(["9:16", "16:9"] as Ratio[]).map((item) => <button key={item} className={ratio === item ? "active" : ""} onClick={() => setRatio(item)}>{item}</button>)}
              </div></div>
              <label className="field">길이 <b>{duration}초</b><input type="range" min="3" max="10" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></label>
            </div>
            <button className="primary" onClick={createPrompt} disabled={busy === "prompt" || !topic.trim()}>
              {busy === "prompt" ? "설계 중…" : "✦ 고품질 프롬프트 설계"}
            </button>
          </section>

          <section className="prompt-card card">
            <div className="section-title"><span>02</span><div><h2>생성 프롬프트</h2><p>피사체 일관성, 물리 표현, 카메라 안정성을 자동 보강합니다.</p></div></div>
            <div className="tabs">
              <button className={activePrompt === "ko" ? "active" : ""} onClick={() => setActivePrompt("ko")}>한국어</button>
              <button className={activePrompt === "en" ? "active" : ""} onClick={() => setActivePrompt("en")}>English</button>
              <button className={activePrompt === "json" ? "active" : ""} onClick={() => setActivePrompt("json")}>구조화</button>
            </div>
            <pre className="prompt-output">{promptText}</pre>
            <button className="copy-button" disabled={!prompt} onClick={() => {
              void navigator.clipboard.writeText(promptText); setStatus("프롬프트를 클립보드에 복사했습니다.");
            }}>복사</button>
          </section>

          <section className="asset-card card">
            <div className="section-title"><span>03</span><div><h2>참고 자료</h2><p>이미지·영상은 계정별 비공개 버킷에 저장됩니다.</p></div></div>
            <label className="check"><input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} /><span>업로드할 파일의 저작권·초상권·사용 권리를 보유하고 있습니다.</span></label>
            <label className={rightsConfirmed ? "upload-zone" : "upload-zone disabled"}>
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={!rightsConfirmed || busy === "upload"} onChange={uploadAsset} />
              <b>{busy === "upload" ? "암호화 업로드 중…" : assetName || "참고 이미지 또는 영상 선택"}</b>
              <span>JPG, PNG, WEBP, MP4, WEBM · 최대 50MB</span>
            </label>
          </section>

          <section className="budget-card card">
            <div className="section-title"><span>04</span><div><h2>비용 보호 설정</h2><p>서버에서도 한도를 재검증해 예상 밖 결제를 차단합니다.</p></div></div>
            <label className="toggle"><input type="checkbox" checked={paidEnabled} onChange={(e) => setPaidEnabled(e.target.checked)} /><span /><b>Gemini 유료 영상 생성 허용</b></label>
            <div className="field-grid">
              <label className="field">하루 최대 예산 (USD)<input type="number" min="0.1" max="100" step="0.1" value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value))} /></label>
              <label className="field">작업당 최대 예산 (USD)<input type="number" min="0.1" max="10" step="0.1" value={singleBudget} onChange={(e) => setSingleBudget(Number(e.target.value))} /></label>
            </div>
            <button className="secondary" onClick={saveSettings} disabled={busy === "settings"}>{busy === "settings" ? "저장 중…" : "예산 설정 저장"}</button>
          </section>

          <section className="generate-card">
            <div><p className="kicker">READY TO RENDER</p><h2>장면을 실제 영상으로 만드세요</h2><p>생성 전 브라우저에서 비용 동의를 한 번 더 확인합니다.</p></div>
            <button className="generate-button" onClick={generateVideo} disabled={!!busy || !projectId || !prompt}>
              {busy === "generate" ? "생성 중… 잠시 기다려 주세요" : "영상 생성 시작 →"}
            </button>
          </section>

          {videoUrl && <section className="result card"><div className="section-title"><span>✓</span><div><h2>완성된 영상</h2><p>서명된 임시 URL로 안전하게 재생됩니다.</p></div></div><video src={videoUrl} controls playsInline /></section>}
          <div className="global-status" role="status"><span>●</span>{status}</div>
        </div>
      </section>
    </main>
  );
}
