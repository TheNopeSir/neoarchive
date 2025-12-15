
import { createClient } from '@supabase/supabase-js';

// ==========================================
// ⚙️ НАСТРОЙКИ КЛИЕНТА
// ==========================================

// 1. Ссылка на проект
const SUPABASE_URL = "https://kovcgjtqbvmuzhsrcktd.supabase.co";

// 2. ВАЖНО: Используем предоставленный ключ для доступа к БД.
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNnanRxYnZtdXpoc3Jja3RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM2MTYyMCwiZXhwIjoyMDgwOTM3NjIwfQ.9dGlbb7TV9SRDnYQULdDMDpZrI4r5XO1FgTCoKqrpf4";

// ==========================================

if (SUPABASE_KEY.includes("ВСТАВЬТЕ_СЮДА")) {
    console.warn("🔴 [Client] Supabase Key is missing in services/supabaseClient.ts");
}

export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_KEY
);
