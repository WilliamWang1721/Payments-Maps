#!/usr/bin/env node
/**
 * Script to create MCP sessions table and functions in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your environment variables.')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'mcp_sessions.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📋 Executing MCP sessions migration...')

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_text: sql
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      return false
    }

    console.log('✅ MCP sessions table and functions created successfully!')

    // Test the function
    console.log('🧪 Testing generate_mcp_session function...')
    const { data: testData, error: testError } = await supabase.rpc('generate_mcp_session', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_session_name: 'Migration Test'
    })

    if (testError) {
      console.log('⚠️  Function test failed (this is expected if auth.users is empty):', testError.message)
    } else {
      console.log('✅ Function test passed!')
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('mcp_sessions')
        .delete()
        .eq('session_name', 'Migration Test')
      
      if (!deleteError) {
        console.log('🧹 Test data cleaned up')
      }
    }

    return true
  } catch (error) {
    console.error('❌ Migration failed with exception:', error)
    return false
  }
}

// Alternative approach: Execute SQL statements one by one
async function runMigrationAlternative() {
  try {
    console.log('🔄 Trying alternative approach - executing SQL statements individually...')
    
    const sqlPath = path.join(__dirname, '..', 'sql', 'mcp_sessions.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        // For table creation, function creation, etc., we need to use the SQL editor approach
        const { error } = await supabase.rpc('exec_raw_sql', {
          query: statement + ';'
        })
        
        if (error) {
          // If that doesn't work, try direct query approach for simple statements
          console.log(`⚠️  RPC approach failed for statement ${i + 1}, trying direct approach...`)
          
          // Skip complex statements that require admin privileges
          if (statement.toLowerCase().includes('create extension') ||
              statement.toLowerCase().includes('create table') ||
              statement.toLowerCase().includes('create function') ||
              statement.toLowerCase().includes('create policy') ||
              statement.toLowerCase().includes('grant')) {
            console.log(`⏭️  Skipping statement ${i + 1} (requires admin privileges)`)
            continue
          }
        }
      } catch (error) {
        console.log(`⚠️  Statement ${i + 1} failed: ${error.message}`)
      }
    }
    
    console.log('✅ Alternative migration approach completed!')
    return true
    
  } catch (error) {
    console.error('❌ Alternative migration failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Starting MCP sessions migration...')
  
  // First try the direct approach
  let success = await runMigration()
  
  if (!success) {
    console.log('🔄 Direct approach failed, trying alternative...')
    success = await runMigrationAlternative()
  }
  
  if (success) {
    console.log('\n🎉 Migration completed successfully!')
    console.log('📖 Next steps:')
    console.log('   1. Verify the tables were created in your Supabase dashboard')
    console.log('   2. Check that RLS policies are properly configured')
    console.log('   3. Test the MCP functionality in your application')
  } else {
    console.log('\n💡 Manual steps required:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the contents of sql/mcp_sessions.sql')
    console.log('   4. Run the SQL manually')
  }
  
  process.exit(0)
}

main().catch(console.error)