export async function GET() {
  return Response.json({
    status: "ok",
    modes: {
      manual: true,
      local: true,
      mock: true,
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
    ffmpeg: "desktop-runtime",
    secretsExposed: false,
  });
}
