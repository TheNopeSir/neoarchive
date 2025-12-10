import { createClient } from '@supabase/supabase-js';

// Credentials provided by user
const supabaseUrl = 'https://kovcgjtqbvmuzhsrcktd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNnanRxYnZtdXpoc3Jja3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjE2MjAsImV4cCI6MjA4MDkzNzYyMH0.xvbQ2YPaG529KgH9oS2K8Psv3hrOYGml21IHxNny6PQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
