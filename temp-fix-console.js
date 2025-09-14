// 临时数据库修复脚本 - 在浏览器控制台中运行
// 这将直接通过 Supabase 客户端执行 SQL

const fixMCPFunction = async () => {
  // 获取 Supabase 客户端
  const { supabase } = window;
  
  if (!supabase) {
    console.error('Supabase 客户端未找到');
    return;
  }

  console.log('🔧 开始修复 MCP 函数...');

  // SQL 语句
  const sql = `
create or replace function public.generate_mcp_session(
  p_user_id uuid,
  p_session_name text default 'Claude Desktop'
)
returns table(session_token text) as $$
declare
  v_token text;
  v_timestamp text := extract(epoch from now())::bigint::text;
  v_random1 text := lpad(floor(random() * 1000000000)::text, 9, '0');
  v_random2 text := lpad(floor(random() * 1000000000)::text, 9, '0');
  v_random3 text := lpad(floor(random() * 1000000000)::text, 9, '0');
begin
  v_token := 'mcp_' || v_timestamp || '_' || v_random1 || v_random2 || v_random3;
  
  insert into public.mcp_sessions (
    user_id,
    session_name,
    client_type,
    session_token,
    permissions,
    is_active,
    last_active
  ) values (
    p_user_id,
    coalesce(p_session_name, 'Claude Desktop'),
    'claude_desktop',
    v_token,
    jsonb_build_object(
      'search', true,
      'add_pos', true,
      'update_pos', true,
      'delete_pos', false,
      'view_details', true
    ),
    true,
    now()
  );

  return query select v_token::text as session_token;
end;
$$ language plpgsql security definer set search_path = public;
  `;

  try {
    // 尝试通过 RPC 执行 SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sql
    });

    if (error) {
      console.error('❌ RPC 方法失败:', error);
      console.log('💡 请尝试在 Supabase 仪表板中手动执行 SQL');
      return false;
    }

    console.log('✅ 函数修复成功!');
    
    // 测试函数
    console.log('🧪 测试函数...');
    const { data: testData, error: testError } = await supabase.rpc('generate_mcp_session', {
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_session_name: 'Console Test'
    });

    if (testError) {
      console.error('⚠️ 函数测试失败:', testError);
    } else {
      console.log('✅ 函数测试成功!', testData);
      
      // 清理测试数据
      await supabase
        .from('mcp_sessions')
        .delete()
        .eq('session_name', 'Console Test');
      
      console.log('🧹 测试数据已清理');
    }

    return true;
  } catch (error) {
    console.error('❌ 执行失败:', error);
    return false;
  }
};

// 执行修复
fixMCPFunction().then(success => {
  if (success) {
    console.log('🎉 MCP 修复完成！请刷新页面测试功能。');
  } else {
    console.log('💡 自动修复失败，请手动在 Supabase 仪表板执行 SQL。');
  }
});