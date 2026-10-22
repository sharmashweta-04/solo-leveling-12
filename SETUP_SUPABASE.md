# SETUP_SUPABASE.md: the only part you do by hand (about 10 minutes, free)

1. Go to supabase.com, sign up, click **New project** (pick any name and password, region nearest to you).
2. Open **SQL Editor**, click **New query**, paste everything from `supabase/schema.sql`, click **Run**.
3. Open **Authentication**, **Providers**, check **Email** is on. While testing you can turn **Confirm email** off.
   In **URL configuration** set Site URL to your Vercel address and add `http://localhost:3000` as a redirect URL.
4. Open **Project Settings**, **API**. Copy the **Project URL** and the **anon public** key.
5. In your project folder create a file named `.env.local` with these two lines:
   NEXT_PUBLIC_SUPABASE_URL=paste-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-anon-key-here
6. On Vercel: Project, Settings, Environment Variables, add the same two.
Never share or paste the **service_role** key anywhere. Menu names may differ slightly from these.
