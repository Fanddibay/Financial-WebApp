/**
 * Verification Script
 * Run this to verify Supabase setup is correct
 * Usage: node verify-setup.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env file
let supabaseUrl, supabaseKey
try {
  const envPath = join(__dirname, '.env')
  const envContent = readFileSync(envPath, 'utf-8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message)
  console.log('💡 Make sure .env file exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySetup() {
  console.log('🔍 Verifying Supabase setup...\n')

  // Test 1: Check connection
  console.log('1️⃣ Testing Supabase connection...')
  try {
    const { data, error } = await supabase.from('license_tokens').select('count').limit(1)
    if (error && error.code === '42P01') {
      console.log('   ⚠️  Table does not exist yet')
      console.log('   💡 Run the SQL in supabase-setup.sql in Supabase SQL Editor\n')
    } else if (error) {
      console.log('   ⚠️  Connection error:', error.message)
      console.log('   💡 Check your Supabase URL and API key\n')
    } else {
      console.log('   ✅ Connection successful!\n')
    }
  } catch (error) {
    console.log('   ❌ Connection failed:', error.message, '\n')
  }

  // Test 2: Check table exists and has tokens
  console.log('2️⃣ Checking license_tokens table...')
  try {
    const { data: tokens, error } = await supabase
      .from('license_tokens')
      .select('token, status, device_id, activated_at')
      .order('token')

    if (error) {
      console.log('   ❌ Error:', error.message)
      if (error.code === '42P01') {
        console.log('   💡 Table does not exist. Run supabase-setup.sql in Supabase SQL Editor\n')
      } else if (error.code === '42501') {
        console.log('   💡 RLS policy issue. Check your RLS policies in Supabase\n')
      }
    } else {
      console.log(`   ✅ Table exists with ${tokens.length} tokens\n`)
      if (tokens.length > 0) {
        console.log('   📋 Tokens in database:')
        tokens.forEach((t) => {
          console.log(`      - ${t.token} (${t.status})`)
        })
        console.log()
      } else {
        console.log('   ⚠️  No tokens found. Insert tokens using supabase-setup.sql\n')
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n')
  }

  // Test 3: Test token query
  console.log('3️⃣ Testing token query...')
  const testToken = 'A1b2C3d4E5f!'
  try {
    const { data, error } = await supabase
      .from('license_tokens')
      .select('*')
      .eq('token', testToken)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`   ⚠️  Test token "${testToken}" not found`)
        console.log('   💡 Make sure you ran supabase-setup.sql to insert tokens\n')
      } else {
        console.log('   ❌ Error:', error.message, '\n')
      }
    } else {
      console.log(`   ✅ Token query works! Found: ${data.token} (${data.status})\n`)
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n')
  }

  console.log('✨ Verification complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. If table doesn\'t exist: Run supabase-setup.sql in Supabase SQL Editor')
  console.log('   2. If tokens missing: Run the INSERT statements from supabase-setup.sql')
  console.log('   3. Test activation in the app: npm run dev → Profile page')
}

verifySetup().catch(console.error)

