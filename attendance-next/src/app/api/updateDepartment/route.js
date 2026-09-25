import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, department } = body;

    if (!action || !department) {
      return NextResponse.json({ error: 'Missing action or department' }, { status: 400 });
    }

    if (action === 'CREATE') {
      const { data, error } = await supabase.from('departments').insert([department]).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else if (action === 'UPDATE') {
      const { data, error } = await supabase.from('departments').update(department).eq('id', department.id).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else if (action === 'DELETE') {
      const { data, error } = await supabase.from('departments').delete().eq('id', department.id).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API /updateDepartment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
