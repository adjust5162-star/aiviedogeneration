export async function GET() {
  return Response.json({
    status: "ok",
    modes: {
      manual: true,
      local: true,
      mock: true,
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
    services: {
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      storage: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    secretsExposed: false,
  });
}
