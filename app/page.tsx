"use client";

import { useMemo, useRef, useState } from "react";

type Mode = "manual" | "google" | "local";
type Ratio = "16:9" | "9:16" | "1:1";
type PromptTab = "한국어" | "English" | "JSON";

const modes: Array<{
  id: Mode;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: string;
}> = [
  {
    id: "manual",
    icon: "↗",
    title: "수동 무료 모드",
    subtitle: "Meta AI · Vibes에서 제작 후 가져오기",
    badge: "무료 · 수동",
    badgeTone: "mint",
  },
  {
    id: "google",
    icon: "✦",
    title: "Google 품질 API",
    subtitle: "Gemini Omni로 생성하고 대화형 편집",
    badge: "예상 유료",
    badgeTone: "amber",
  },
  {
    id: "local",
    icon: "⌁",
    title: "로컬 후반 작업",
    subtitle: "FFmpeg로 보정 · 자막 · 최종 출력",
    badge: "무료 · 로컬",
    badgeTone: "blue",
  },
];

const shots = [
  {
    id: "S01",
    duration: "4초",
    title: "새벽의 시작",
    copy: "창가에 선 러너. 푸른 새벽빛 속에서 신발 끈을 단단히 묶는다.",
    camera: "85mm 클로즈업 · 슬로우 돌리 인",
    color: "linear-gradient(135deg, #101a28 0%, #254a6b 52%, #ec9d68 100%)",
  },
  {
    id: "S02",
    duration: "5초",
    title: "도시를 가르다",
    copy: "젖은 도로 위를 달리는 동일 인물. 호흡과 발걸음이 리듬을 만든다.",
    camera: "35mm 트래킹 · 낮은 앵글",
    color: "linear-gradient(145deg, #223344 0%, #657d91 42%, #edbd70 100%)",
  },
  {
    id: "S03",
    duration: "4초",
    title: "빛에 닿다",
    copy: "한강 변에서 멈춰 선 러너 뒤로 따뜻한 해가 떠오른다.",
    camera: "24mm 와이드 · 고정 프레임",
    color: "linear-gradient(160deg, #d47c59 0%, #f4bc72 50%, #24445b 100%)",
  },
];

const nav = [
  ["⌂", "대시보드"],
  ["＋", "새 프로젝트"],
  ["▱", "스토리보드"],
  ["✦", "프롬프트 랩"],
  ["◇", "에셋 라이브러리"],
  ["◴", "생성 대기열"],
  ["✓", "품질 리포트"],
  ["⇩", "내보내기"],
];

function buildPrompts(topic: string) {
  const cleanTopic = topic.trim() || "새벽 도시를 달리는 러너의 브랜드 필름";
  return {
    ko: `${cleanTopic}. 동일한 인물과 의상을 유지하며, 사실적인 속도와 물리 표현으로 자연스럽게 움직인다. 카메라는 흔들림 없이 피사체를 추적하고 따뜻한 새벽빛으로 마무리한다. 자막을 위한 안전 여백을 남긴다.`,
    en: `A cinematic brand film about ${cleanTopic}. Preserve the same subject identity, wardrobe, face, product geometry and key colors across every shot. Natural running speed and physically plausible movement in a dawn city environment. Stable tracking camera, layered depth, soft blue-hour light shifting gradually to warm sunrise. Keep anatomy and object count stable. Leave clean negative space for captions. No sudden subject replacement, duplicate limbs, unintended text, logos, subtitles, borders, watermarks, exposure jumps or color-temperature shifts.`,
    json: JSON.stringify(
      {
        subject_identity: "same adult runner, consistent face and wardrobe",
        action: cleanTopic,
        environment: "quiet city at blue hour, wet road, riverside sunrise",
        composition: "caption-safe negative space, layered depth",
        camera: "stable tracking, 35mm lens feel, controlled dolly",
        lighting: "blue-hour ambient light to warm sunrise",
        motion_physics: "realistic speed, natural foot contact and fabric motion",
        continuity: ["face", "wardrobe", "shoe geometry", "key colors"],
        negative_constraints: [
          "duplicate limbs",
          "subject replacement",
          "camera shake",
          "unintended text or watermark",
          "abrupt exposure shift",
        ],
      },
      null,
      2,
    ),
  };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("manual");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [topic, setTopic] = useState("매일 아침, 나를 넘어서는 러너의 15초 브랜드 필름");
  const [promptTab, setPromptTab] = useState<PromptTab>("한국어");
  const [activeNav, setActiveNav] = useState("새 프로젝트");
  const [notice, setNotice] = useState("아이디어를 입력하면 장면별 프롬프트를 자동으로 정리합니다.");
  const [assetName, setAssetName] = useState("");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const prompts = useMemo(() => buildPrompts(topic), [topic]);

  function runMock() {
    if (mode === "google") {
      const ok = window.confirm(
        "Gemini Omni Flash는 유료 호출일 수 있습니다. 현재는 결제 없는 모의 생성만 실행합니다. 계속할까요?",
      );
      if (!ok) return;
    }
    setIsGenerating(true);
    setProgress(12);
    setNotice("프롬프트 안전성과 장면 연속성을 확인하고 있습니다.");
    const steps = [34, 58, 76, 100];
    steps.forEach((value, index) => {
      window.setTimeout(() => {
        setProgress(value);
        if (value === 100) {
          setIsGenerating(false);
          setNotice("모의 생성이 완료되었습니다. 품질 점수 92점 · 경고 1건");
        }
      }, 620 * (index + 1));
    });
  }

  function exportPromptPack() {
    const blob = new Blob(
      [
        `AI VIDEO STUDIO · PROMPT PACK\n\n[KOREAN]\n${prompts.ko}\n\n[ENGLISH]\n${prompts.en}\n\n[STRUCTURED JSON]\n${prompts.json}`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-video-studio-prompt-pack.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Meta AI · Vibes에 붙여 넣을 프롬프트 팩을 저장했습니다.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="주 메뉴">
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>
            <b>AI VIDEO</b>
            <small>STUDIO</small>
          </span>
        </div>
        <nav>
          <p className="nav-label">WORKSPACE</p>
          {nav.map(([icon, label]) => (
            <button
              className={activeNav === label ? "nav-item active" : "nav-item"}
              key={label}
              onClick={() => {
                setActiveNav(label);
                setNotice(`${label} 화면을 선택했습니다.`);
              }}
            >
              <span>{icon}</span>
              {label}
              {label === "생성 대기열" && <em>2</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage">
            <div>
              <span>로컬 저장공간</span>
              <b>3.8 GB / 10 GB</b>
            </div>
            <div className="storage-track">
              <i />
            </div>
          </div>
          <button className="nav-item" onClick={() => setNotice("환경 설정은 안전한 서버 변수만 사용합니다.")}>
            <span>⚙</span> 설정
          </button>
          <div className="profile">
            <span>크</span>
            <div>
              <b>크리에이터</b>
              <small>로컬 작업공간</small>
            </div>
            <i>•••</i>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">NEW PROJECT</span>
            <h1>새로운 영상을 설계해 볼까요?</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="알림">♢<span /></button>
            <button className="help-button">? 도움말</button>
          </div>
        </header>

        <div className="content">
          <section className="mode-section" aria-labelledby="mode-title">
            <div className="section-heading">
              <div>
                <span className="step-number">01</span>
                <div>
                  <h2 id="mode-title">제작 방식을 선택하세요</h2>
                  <p>비용과 목적에 맞는 워크플로우를 고를 수 있습니다.</p>
                </div>
              </div>
              <button className="text-button" onClick={() => setNotice("각 모드의 비용·데이터 처리 차이를 확인하세요.")}>모드 비교 ↗</button>
            </div>
            <div className="mode-grid">
              {modes.map((item) => (
                <button
                  className={mode === item.id ? "mode-card selected" : "mode-card"}
                  key={item.id}
                  onClick={() => {
                    setMode(item.id);
                    setNotice(`${item.title}를 선택했습니다.`);
                  }}
                  aria-pressed={mode === item.id}
                >
                  <span className="mode-icon">{item.icon}</span>
                  <span className={`status-badge ${item.badgeTone}`}>{item.badge}</span>
                  <b>{item.title}</b>
                  <small>{item.subtitle}</small>
                  <i>{mode === item.id ? "✓" : ""}</i>
                </button>
              ))}
            </div>
            <div className="policy-note">
              <span>i</span>
              <p>
                <b>제공자의 현재 정책에 따라 이용 가능 여부와 한도가 달라집니다.</b>
                Meta AI · Vibes는 공식 화면에서 직접 사용하며, 워터마크와 이용 권리를 존중합니다.
              </p>
            </div>
          </section>

          <section className="brief-section" aria-labelledby="brief-title">
            <div className="section-heading">
              <div>
                <span className="step-number">02</span>
                <div>
                  <h2 id="brief-title">아이디어를 들려주세요</h2>
                  <p>한 문장으로 시작해도 충분합니다.</p>
                </div>
              </div>
              <span className="autosave">● 자동 저장됨</span>
            </div>
            <div className="brief-card">
              <label htmlFor="topic">영상의 핵심 아이디어</label>
              <textarea
                id="topic"
                value={topic}
                maxLength={500}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="예: 새벽 도시를 달리는 러너의 15초 브랜드 필름"
              />
              <div className="field-meta">
                <span>구체적인 인물, 행동, 분위기를 적으면 결과가 좋아집니다.</span>
                <span>{topic.length} / 500</span>
              </div>
              <div className="brief-row">
                <div className="field">
                  <label>게시 플랫폼</label>
                  <select defaultValue="shorts">
                    <option value="shorts">Shorts · Reels · TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="square">정사각형 피드</option>
                  </select>
                </div>
                <div className="field">
                  <label>화면 비율</label>
                  <div className="ratio-switch">
                    {(["16:9", "9:16", "1:1"] as Ratio[]).map((item) => (
                      <button
                        key={item}
                        className={ratio === item ? "active" : ""}
                        onClick={() => setRatio(item)}
                      >
                        <span className={`ratio-shape ratio-${item.replace(":", "")}`} />
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field compact">
                  <label>목표 길이</label>
                  <select defaultValue="15">
                    <option value="15">15초</option>
                    <option value="30">30초</option>
                    <option value="60">60초</option>
                  </select>
                </div>
              </div>
              <div className="asset-row">
                <div>
                  <span className="upload-icon">⌁</span>
                  <div>
                    <b>{assetName || "참고 이미지나 영상을 추가하세요"}</b>
                    <small>권리를 보유한 파일만 · 원본은 변경하지 않음</small>
                  </div>
                </div>
                <button onClick={() => fileRef.current?.click()}>{assetName ? "다시 선택" : "파일 선택"}</button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setAssetName(file.name);
                      setNotice("파일을 로컬 참조 에셋으로 추가했습니다. 원본은 보존됩니다.");
                    }
                  }}
                />
              </div>
              <label className="rights-check">
                <input type="checkbox" defaultChecked />
                <span>업로드한 에셋의 소유권 또는 사용 허가를 보유하고 있습니다.</span>
              </label>
            </div>
          </section>

          <section className="story-section">
            <div className="section-heading">
              <div>
                <span className="step-number">03</span>
                <div>
                  <h2>AI 스토리보드</h2>
                  <p>길이에 맞춰 짧은 생성 클립으로 자동 분할했습니다.</p>
                </div>
              </div>
              <span className="duration-pill">총 13초 · 3 SHOTS</span>
            </div>
            <div className="shot-list">
              {shots.map((shot, index) => (
                <article className="shot-card" key={shot.id}>
                  <div className="shot-visual" style={{ background: shot.color }}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                  </div>
                  <div className="shot-content">
                    <div className="shot-title">
                      <span>{shot.id}</span><b>{shot.title}</b><em>{shot.duration}</em>
                    </div>
                    <p>{shot.copy}</p>
                    <small>⌾ {shot.camera}</small>
                  </div>
                  <button aria-label={`${shot.id} 편집`} onClick={() => setNotice(`${shot.id} 장면 편집 준비가 되었습니다.`)}>•••</button>
                </article>
              ))}
            </div>
          </section>

          <section className="lab-grid">
            <div className="prompt-lab">
              <div className="panel-heading">
                <div>
                  <span>✦</span>
                  <div><h3>프롬프트 디렉터</h3><p>관찰 가능한 지시로 결과의 일관성을 높였습니다.</p></div>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(prompts.en).then(() => setNotice("영문 프롬프트를 복사했습니다."))}>복사</button>
              </div>
              <div className="tabbar" role="tablist">
                {(["한국어", "English", "JSON"] as PromptTab[]).map((tab) => (
                  <button
                    role="tab"
                    aria-selected={promptTab === tab}
                    className={promptTab === tab ? "active" : ""}
                    key={tab}
                    onClick={() => setPromptTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <pre>{promptTab === "한국어" ? prompts.ko : promptTab === "English" ? prompts.en : prompts.json}</pre>
              <div className="constraint-row">
                <span>연속성 잠금</span>
                <span>안정된 해부학</span>
                <span>텍스트 생성 금지</span>
                <span>자막 안전영역</span>
              </div>
            </div>

            <aside className="quality-panel">
              <div className="panel-heading">
                <div>
                  <span>✓</span>
                  <div><h3>예상 품질</h3><p>기술·연속성 기준의 참고 점수</p></div>
                </div>
              </div>
              <div className="score-ring"><b>92</b><span>/ 100</span></div>
              <div className="metric"><span>프롬프트 구체성</span><b>96</b><i style={{ width: "96%" }} /></div>
              <div className="metric"><span>장면 연속성</span><b>91</b><i style={{ width: "91%" }} /></div>
              <div className="metric"><span>출력 안전성</span><b>89</b><i style={{ width: "89%" }} /></div>
              <p className="quality-note">미학적 품질은 객관적 사실이 아닙니다. 생성 후 직접 검토하세요.</p>
            </aside>
          </section>

          <div className="action-dock">
            <div className="dock-status">
              <span className={isGenerating ? "pulse-dot" : ""}>✦</span>
              <div>
                <b>{isGenerating ? `모의 생성 중 · ${progress}%` : notice}</b>
                <small>
                  {mode === "manual"
                    ? "API 비용 없음 · 제공자 화면에서 직접 생성"
                    : mode === "local"
                      ? "생성 API 호출 없음 · 로컬 후반 작업"
                      : "실제 유료 호출 전 비용 확인과 명시적 승인이 필요합니다"}
                </small>
              </div>
            </div>
            <div className="dock-actions">
              <button className="secondary-button" onClick={exportPromptPack}>프롬프트 팩 저장</button>
              <button className="primary-button" onClick={runMock} disabled={isGenerating}>
                {isGenerating ? "처리 중…" : mode === "manual" ? "무료 제작 시작" : mode === "local" ? "후반 작업 준비" : "모의 생성 실행"} <span>→</span>
              </button>
            </div>
            {isGenerating && <div className="progress-bar"><i style={{ width: `${progress}%` }} /></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
