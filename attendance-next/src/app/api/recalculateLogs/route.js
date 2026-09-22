import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Service Role Key bypasses RLS
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ message: 'No updates provided' }, { status: 400 });
    }

    const { error: upsertErr } = await supabase
      .from('attendance_logs')
      .upsert(updates);

    if (upsertErr) {
      throw upsertErr;
    }

    return NextResponse.json({ success: true, message: 'Successfully updated logs' });
  } catch (error) {
    console.error('Error recalculating logs in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
