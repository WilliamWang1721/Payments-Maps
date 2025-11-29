import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

// 通过服务端安全接口在当前环境创建/修复通知相关表
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.NOTIFICATIONS_BOOTSTRAP_SECRET || process.env.BOOTSTRAP_SECRET
  const incomingSecret = req.headers['x-bootstrap-secret']
  if (!secret) {
    return res.status(500).json({ error: 'Missing NOTIFICATIONS_BOOTSTRAP_SECRET env' })
  }
  if (incomingSecret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const connectionString =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_CONNECTION_STRING

  if (!connectionString) {
    return res.status(500).json({ error: 'Missing DB connection string (SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL)' })
  }

  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20250307_create_notifications.sql')
  let sql = ''
  try {
    sql = fs.readFileSync(sqlPath, 'utf8')
  } catch (error) {
    console.error('读取通知迁移文件失败:', error)
    return res.status(500).json({ error: 'Failed to read migration file' })
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    const client = await pool.connect()
    try {
      await client.query(sql)
      return res.status(200).json({ ok: true, message: 'Notifications tables ensured' })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('执行通知迁移失败:', error)
    return res.status(500).json({ error: 'Failed to apply migration', detail: error?.message })
  } finally {
    await pool.end()
  }
}
