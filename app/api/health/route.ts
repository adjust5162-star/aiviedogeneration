export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  return Response.json({
    status: supabaseConfigured ? "ready" : "configuration_required",
    services: {
      supabase: supabaseConfigured,
      storage: supabaseConfigured,
      gemini: geminiConfigured,
      dryRun: process.env.DRY_RUN === "true",
    },
    secretsExposed: false,
  });
}
