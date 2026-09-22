import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { employee_id, updates } = body;

    if (!employee_id || !updates) {
      return NextResponse.json({ error: 'Missing employee_id or updates' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('employee_id', employee_id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API /updateEmployee error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
