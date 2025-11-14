import { createClient } from 'npm:@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .in('name', ['user', 'lab_admin']);

    const userRoleId = roleData?.find(r => r.name === 'user')?.id;
    const labAdminRoleId = roleData?.find(r => r.name === 'lab_admin')?.id;

    const { data: deptData } = await supabaseAdmin
      .from('departments')
      .select('id')
      .limit(1)
      .single();

    const { data: labData } = await supabaseAdmin
      .from('activities')
      .select('id, name')
      .limit(1)
      .single();

    const results = [];

    const { data: normalUserAuth, error: normalUserError } = await supabaseAdmin.auth.admin.createUser({
      email: 'user@labmanager.com',
      password: 'User123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Normal User',
      },
    });

    if (normalUserError) {
      results.push({ user: 'normal', error: normalUserError.message });
    } else {
      await supabaseAdmin.from('profiles').insert({
        id: normalUserAuth.user.id,
        email: 'user@labmanager.com',
        full_name: 'Normal User',
        role_id: userRoleId,
        department_id: deptData?.id,
      });
      results.push({ user: 'normal', email: 'user@labmanager.com', password: 'User123!', success: true });
    }

    const { data: labAdminAuth, error: labAdminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'labadmin@labmanager.com',
      password: 'LabAdmin123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Lab Manager',
      },
    });

    if (labAdminError) {
      results.push({ user: 'lab_admin', error: labAdminError.message });
    } else {
      await supabaseAdmin.from('profiles').insert({
        id: labAdminAuth.user.id,
        email: 'labadmin@labmanager.com',
        full_name: 'Lab Manager',
        role_id: labAdminRoleId,
        department_id: deptData?.id,
      });

      await supabaseAdmin.from('managed_labs').insert({
        lab_admin_id: labAdminAuth.user.id,
        lab_id: labData?.id,
      });

      results.push({
        user: 'lab_admin',
        email: 'labadmin@labmanager.com',
        password: 'LabAdmin123!',
        managed_lab: labData?.name,
        success: true
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});