// ==========================================
// ⚙️ НАСТРОЙКИ КЛИЕНТА
// ==========================================

// 1. Ссылка на проект
const SUPABASE_URL = "https://kovcgjtqbvmuzhsrcktd.supabase.co";

// 2. ВАЖНО: Используем предоставленный ключ для доступа к БД.
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNnanRxYnZtdXpoc3Jja3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjE2MjAsImV4cCI6MjA4MDkzNzYyMH0.xvbQ2YPaG529KgH9oS2K8Psv3hrOYGml21IHxNny6PQ";

// ==========================================

if (SUPABASE_KEY.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNnanRxYnZtdXpoc3Jja3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjE2MjAsImV4cCI6MjA4MDkzNzYyMH0.xvbQ2YPaG529KgH9oS2K8Psv3hrOYGml21IHxNny6PQ")) {
    console.warn("🔴 [Client] Supabase Key is missing in services/supabaseClient.ts");
}

export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_KEY
);