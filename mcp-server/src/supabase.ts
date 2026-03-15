import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

let cachedClient: SupabaseClient | null = null;

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL?.trim(),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  };
}

export function isSupabaseServerConfigured(): boolean {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function createSupabaseClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new ConfigurationError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Fluxa MCP server.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: "public"
    },
    global: {
      headers: {
        "x-client-info": "fluxa-mcp-server"
      }
    }
  });
}

function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient();
  }

  return cachedClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, _receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, property, client);

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  }
}) as SupabaseClient;
