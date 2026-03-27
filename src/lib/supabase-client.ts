import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://taixrrjhligukcjhtrrl.supabase.co";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_sTFlbwCR-8SMgpkDd4vWmg_4pRgISeq";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
