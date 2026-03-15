import { randomUUID } from "crypto";

export interface UserSession {
  id: string;
  userId: string;
  user: any;
  createdAt: Date;
  lastAccessAt: Date;
  expiresAt: Date;
}

/**
 * 会话管理器 - 管理多用户会话
 */
export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 小时

  /**
   * 创建新会话
   */
  createSession(user: any): string {
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION);

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      user,
      createdAt: now,
      lastAccessAt: now,
      expiresAt,
    };

    this.sessions.set(sessionId, session);
    
    console.log(`✅ 创建会话: ${sessionId} for user ${user.user_metadata?.display_name || user.email}`);
    
    return sessionId;
  }

  /**
   * 验证会话是否有效
   */
  isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    const now = new Date();
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      console.log(`🕐 会话过期已清理: ${sessionId}`);
      return false;
    }

    // 更新最后访问时间
    session.lastAccessAt = now;
    return true;
  }

  /**
   * 获取用户信息
   */
  getUser(sessionId: string): any | null {
    const session = this.sessions.get(sessionId);
    
    if (!session || !this.isValidSession(sessionId)) {
      return null;
    }

    return session.user;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): UserSession | null {
    if (!this.isValidSession(sessionId)) {
      return null;
    }
    
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️  会话已删除: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * 延长会话有效期
   */
  extendSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session || !this.isValidSession(sessionId)) {
      return false;
    }

    const now = new Date();
    session.expiresAt = new Date(now.getTime() + this.SESSION_DURATION);
    session.lastAccessAt = now;
    
    console.log(`⏰ 会话已延期: ${sessionId}`);
    return true;
  }

  /**
   * 获取用户的所有会话
   */
  getUserSessions(userId: string): UserSession[] {
    const userSessions: UserSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId && this.isValidSession(session.id)) {
        userSessions.push(session);
      }
    }
    
    return userSessions;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): string[] {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      console.log(`🧹 清理了 ${expiredSessions.length} 个过期会话`);
    }

    return expiredSessions;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values()).filter(
      session => now <= session.expiresAt
    );

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      uniqueUsers: new Set(activeSessions.map(s => s.userId)).size,
      oldestSession: activeSessions.reduce((oldest, session) => 
        !oldest || session.createdAt < oldest.createdAt ? session : oldest, 
        null as UserSession | null
      ),
    };
  }

  /**
   * 列出所有活跃会话（用于管理）
   */
  listActiveSessions(): Array<{
    sessionId: string;
    userId: string;
    userEmail: string;
    userName: string;
    createdAt: Date;
    lastAccessAt: Date;
    expiresAt: Date;
  }> {
    const activeSessions: any[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isValidSession(sessionId)) {
        activeSessions.push({
          sessionId,
          userId: session.userId,
          userEmail: session.user.email || 'Unknown',
          userName: session.user.user_metadata?.display_name || 'Unknown',
          createdAt: session.createdAt,
          lastAccessAt: session.lastAccessAt,
          expiresAt: session.expiresAt,
        });
      }
    }

    return activeSessions.sort((a, b) => b.lastAccessAt.getTime() - a.lastAccessAt.getTime());
  }
}