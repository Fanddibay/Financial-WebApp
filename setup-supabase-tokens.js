/**
 * Script to setup Supabase license tokens
 * Run this with: node setup-supabase-tokens.js
 * 
 * Make sure you have @supabase/supabase-js installed first
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yfjxcxvgxfdruxfhsbrk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const initialTokens = [
  'A1b2C3d4E5f!',
  'X9y8Z7w6V5u@',
  'M3n2O1p0Q9r#',
  'S7t6U5v4W3x$',
  'K1l2M3n4O5p%',
]

async function setupTokens() {
  console.log('🚀 Setting up Supabase license tokens...\n')

  // First, try to create the table (this might fail if it exists, which is fine)
  console.log('📋 Creating license_tokens table...')
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS license_tokens (
        token TEXT PRIMARY KEY,
        device_id TEXT,
        status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
        activated_at TIMESTAMPTZ
      );
    `,
  })

  if (createError && !createError.message.includes('already exists')) {
    console.warn('⚠️  Table creation note:', createError.message)
  } else {
    console.log('✅ Table ready\n')
  }

  // Insert tokens
  console.log('🔑 Inserting initial tokens...')
  let successCount = 0
  let errorCount = 0

  for (const token of initialTokens) {
    const { data, error } = await supabase
      .from('license_tokens')
      .upsert(
        {
          token,
          status: 'inactive',
          device_id: null,
          activated_at: null,
        },
        {
          onConflict: 'token',
        },
      )
      .select()

    if (error) {
      console.error(`❌ Error inserting token ${token}:`, error.message)
      errorCount++
    } else {
      console.log(`✅ Token inserted: ${token}`)
      successCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)

  // Verify tokens
  console.log('\n🔍 Verifying tokens...')
  const { data: tokens, error: fetchError } = await supabase
    .from('license_tokens')
    .select('token, status, device_id, activated_at')
    .order('token')

  if (fetchError) {
    console.error('❌ Error fetching tokens:', fetchError.message)
  } else {
    console.log(`✅ Found ${tokens.length} tokens in database:`)
    tokens.forEach((t) => {
      console.log(`   - ${t.token} (${t.status})`)
    })
  }

  console.log('\n✨ Setup complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Enable RLS on the table in Supabase dashboard')
  console.log('   2. Create SELECT and UPDATE policies (see supabase-setup.sql)')
  console.log('   3. Test token activation in the app')
}

setupTokens().catch(console.error)

