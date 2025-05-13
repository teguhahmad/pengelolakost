import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Verify the requesting user is authorized
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication failed: Invalid token');
    }

    if (!user) {
      throw new Error('User not found or unauthorized');
    }

    // Get the user IDs from the request
    const { userIds } = await req.json();
    
    if (!Array.isArray(userIds)) {
      throw new Error('userIds must be an array');
    }

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }

    // Validate userIds format
    const validUserIds = userIds.every(id => 
      typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );

    if (!validUserIds) {
      throw new Error('Invalid user ID format detected');
    }

    // Fetch user details from the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Database error:', profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Transform profiles to match the expected format
    const userDetails = (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email?.split('@')[0] || 'Unknown User',
    }));

    // Track any IDs that weren't found
    const foundIds = new Set(profiles?.map(p => p.id) || []);
    const notFoundIds = userIds.filter(id => !foundIds.has(id));

    return new Response(
      JSON.stringify({ 
        users: userDetails,
        notFound: notFoundIds.length > 0 ? notFoundIds : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        type: error.name,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: error.message.includes('Authentication failed') ? 401 : 
                error.message.includes('unauthorized') ? 403 : 400,
      }
    );
  }
});
