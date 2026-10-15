-- Make the public seller-profile projection obey the caller's grants and RLS.
-- This resolves the Supabase Security Advisor's security-definer view finding.
alter view if exists public.marketplace_seller_profiles
set (security_invoker = true);
