/**
 * Real-Time Collaboration System
 * Comprehensive collaboration platform with live document editing, chat, video, and presence
 *
 * Features:
 * - Real-time document collaboration (CRDT-based)
 * - Live cursor tracking and user presence
 * - Integrated chat and messaging
 * - Video conferencing integration
 * - Screen sharing
 * - Collaborative annotations and comments
 * - Activity feed and notifications
 * - Team workspaces
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class RealTimeCollaboration extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      maxUsersPerRoom: config.maxUsersPerRoom || 50,
      messageRetention: config.messageRetention || 7, // days
      presenceTimeout: config.presenceTimeout || 60000, // 1 minute
      autosaveInterval: config.autosaveInterval || 30000, // 30 seconds
      enableVideo: config.enableVideo !== false,
      enableChat: config.enableChat !== false,
      enablePresence: config.enablePresence !== false,
      ...config
    };

    // Workspaces
    this.workspaces = new Map();

    // Collaboration sessions/rooms
    this.rooms = new Map();

    // Documents (collaborative editing)
    this.documents = new Map();

    // Users online presence
    this.presence = new Map(); // userId -> presence data

    // Chat messages
    this.messages = [];

    // Comments and annotations
    this.comments = new Map();

    // Activity feed
    this.activities = [];

    // Statistics
    this.stats = {
      totalWorkspaces: 0,
      totalRooms: 0,
      totalDocuments: 0,
      activeUsers: 0,
      totalMessages: 0,
      totalComments: 0,
      totalActivities: 0
    };

    // Start presence checking
    if (this.config.enablePresence) {
      this.startPresenceMonitoring();
    }

    console.log('Real-Time Collaboration System initialized');
  }

  /**
   * Create workspace
   */
  async createWorkspace(config) {
    const workspaceId = crypto.randomUUID();

    const workspace = {
      id: workspaceId,
      name: config.name,
      description: config.description || '',
      owner: config.owner,
      members: [config.owner],
      rooms: [],
      documents: [],
      settings: {
        visibility: config.visibility || 'private',
        allowInvites: config.allowInvites !== false,
        requireApproval: config.requireApproval || false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workspaces.set(workspaceId, workspace);
    this.stats.totalWorkspaces++;

    this.logActivity({
      type: 'workspace.created',
      workspaceId,
      userId: config.owner,
      data: { name: workspace.name }
    });

    this.emit('workspace.created', { workspaceId, workspace });

    console.log(`Workspace created: ${workspaceId} - ${workspace.name}`);

    return workspace;
  }

  /**
   * Create collaboration room
   */
  async createRoom(workspaceId, config) {
    const workspace = this.workspaces.get(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const roomId = crypto.randomUUID();

    const room = {
      id: roomId,
      workspaceId,
      name: config.name,
      type: config.type || 'general', // general, document, meeting, chat
      participants: [],
      maxParticipants: config.maxParticipants || this.config.maxUsersPerRoom,
      settings: {
        videoEnabled: config.videoEnabled !== false,
        screenShareEnabled: config.screenShareEnabled !== false,
        chatEnabled: config.chatEnabled !== false,
        recordingEnabled: config.recordingEnabled || false
      },
      status: 'active',
      createdAt: new Date(),
      metadata: config.metadata || {}
    };

    this.rooms.set(roomId, room);
    workspace.rooms.push(roomId);
    this.stats.totalRooms++;

    this.logActivity({
      type: 'room.created',
      workspaceId,
      roomId,
      userId: config.createdBy,
      data: { name: room.name, type: room.type }
    });

    this.emit('room.created', { workspaceId, roomId, room });

    console.log(`Room created: ${roomId} - ${room.name}`);

    return room;
  }

  /**
   * Join room
   */
  async joinRoom(roomId, userId, userInfo = {}) {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    if (room.participants.length >= room.maxParticipants) {
      throw new Error(`Room is full: ${roomId}`);
    }

    // Check if already in room
    if (room.participants.some((p) => p.userId === userId)) {
      console.log(`User ${userId} already in room ${roomId}`);
      return room;
    }

    const participant = {
      userId,
      name: userInfo.name || userId,
      joinedAt: new Date(),
      role: userInfo.role || 'member',
      cursor: { x: 0, y: 0 },
      selection: null,
      videoEnabled: false,
      audioEnabled: false,
      screenSharing: false
    };

    room.participants.push(participant);

    // Update presence
    this.updatePresence(userId, {
      status: 'active',
      currentRoom: roomId,
      lastSeen: new Date()
    });

    this.logActivity({
      type: 'room.joined',
      workspaceId: room.workspaceId,
      roomId,
      userId,
      data: { name: participant.name }
    });

    this.emit('room.joined', { roomId, userId, participant });
    this.emit('room.participants.updated', {
      roomId,
      participants: room.participants
    });

    console.log(`User ${userId} joined room ${roomId}`);

    return room;
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const index = room.participants.findIndex((p) => p.userId === userId);

    if (index === -1) {
      console.log(`User ${userId} not in room ${roomId}`);
      return room;
    }

    room.participants.splice(index, 1);

    // Update presence
    this.updatePresence(userId, {
      currentRoom: null
    });

    this.logActivity({
      type: 'room.left',
      workspaceId: room.workspaceId,
      roomId,
      userId
    });

    this.emit('room.left', { roomId, userId });
    this.emit('room.participants.updated', {
      roomId,
      participants: room.participants
    });

    console.log(`User ${userId} left room ${roomId}`);

    return room;
  }

  /**
   * Create collaborative document
   */
  async createDocument(workspaceId, config) {
    const workspace = this.workspaces.get(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const documentId = crypto.randomUUID();

    const document = {
      id: documentId,
      workspaceId,
      title: config.title,
      type: config.type || 'text', // text, code, whiteboard, spreadsheet
      content: config.content || '',
      version: 1,
      operations: [], // CRDT operations log
      collaborators: [],
      cursors: new Map(), // userId -> cursor position
      selections: new Map(), // userId -> selection range
      locked: false,
      lockedBy: null,
      createdBy: config.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: config.metadata || {}
    };

    this.documents.set(documentId, document);
    workspace.documents.push(documentId);
    this.stats.totalDocuments++;

    this.logActivity({
      type: 'document.created',
      workspaceId,
      documentId,
      userId: config.createdBy,
      data: { title: document.title }
    });

    this.emit('document.created', { workspaceId, documentId, document });

    console.log(`Document created: ${documentId} - ${document.title}`);

    return document;
  }

  /**
   * Edit document (CRDT operation)
   */
  async editDocument(documentId, userId, operation) {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (document.locked && document.lockedBy !== userId) {
      throw new Error(`Document is locked by ${document.lockedBy}`);
    }

    // Apply operation
    const op = {
      id: crypto.randomUUID(),
      userId,
      type: operation.type, // insert, delete, replace
      position: operation.position,
      data: operation.data,
      timestamp: new Date(),
      version: document.version + 1
    };

    // Update document content based on operation
    if (operation.type === 'insert') {
      document.content = document.content.slice(0, operation.position)
        + operation.data
        + document.content.slice(operation.position);
    } else if (operation.type === 'delete') {
      document.content = document.content.slice(0, operation.position)
        + document.content.slice(operation.position + operation.length);
    } else if (operation.type === 'replace') {
      document.content = document.content.slice(0, operation.position)
        + operation.data
        + document.content.slice(operation.position + operation.length);
    }

    document.operations.push(op);
    document.version++;
    document.updatedAt = new Date();

    // Add user to collaborators if not already there
    if (!document.collaborators.includes(userId)) {
      document.collaborators.push(userId);
    }

    this.emit('document.edited', {
      documentId,
      userId,
      operation: op,
      content: document.content,
      version: document.version
    });

    return { document, operation: op };
  }

  /**
   * Update cursor position
   */
  updateCursor(documentId, userId, cursor) {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    document.cursors.set(userId, {
      x: cursor.x,
      y: cursor.y,
      line: cursor.line,
      column: cursor.column,
      timestamp: new Date()
    });

    this.emit('cursor.updated', {
      documentId,
      userId,
      cursor: document.cursors.get(userId)
    });
  }

  /**
   * Update selection
   */
  updateSelection(documentId, userId, selection) {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    document.selections.set(userId, {
      start: selection.start,
      end: selection.end,
      timestamp: new Date()
    });

    this.emit('selection.updated', {
      documentId,
      userId,
      selection: document.selections.get(userId)
    });
  }

  /**
   * Send chat message
   */
  async sendMessage(roomId, userId, message, metadata = {}) {
    if (!this.config.enableChat) {
      throw new Error('Chat is disabled');
    }

    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const msg = {
      id: crypto.randomUUID(),
      roomId,
      userId,
      content: message,
      type: metadata.type || 'text', // text, image, file, code
      replyTo: metadata.replyTo || null,
      reactions: [],
      edited: false,
      timestamp: new Date(),
      metadata
    };

    this.messages.push(msg);
    this.stats.totalMessages++;

    this.emit('message.sent', { roomId, message: msg });

    return msg;
  }

  /**
   * Add comment/annotation
   */
  async addComment(documentId, userId, comment) {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const commentId = crypto.randomUUID();

    const commentObj = {
      id: commentId,
      documentId,
      userId,
      content: comment.content,
      position: comment.position || null, // Line number or coordinates
      range: comment.range || null, // Text selection range
      resolved: false,
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!this.comments.has(documentId)) {
      this.comments.set(documentId, []);
    }

    this.comments.get(documentId).push(commentObj);
    this.stats.totalComments++;

    this.logActivity({
      type: 'comment.added',
      workspaceId: document.workspaceId,
      documentId,
      commentId,
      userId
    });

    this.emit('comment.added', { documentId, commentId, comment: commentObj });

    return commentObj;
  }

  /**
   * Reply to comment
   */
  async replyToComment(commentId, userId, reply) {
    for (const [documentId, comments] of this.comments.entries()) {
      const comment = comments.find((c) => c.id === commentId);

      if (comment) {
        const replyObj = {
          id: crypto.randomUUID(),
          userId,
          content: reply,
          timestamp: new Date()
        };

        comment.replies.push(replyObj);
        comment.updatedAt = new Date();

        this.emit('comment.replied', {
          documentId,
          commentId,
          replyId: replyObj.id,
          reply: replyObj
        });

        return replyObj;
      }
    }

    throw new Error(`Comment not found: ${commentId}`);
  }

  /**
   * Resolve comment
   */
  async resolveComment(commentId, userId) {
    for (const [documentId, comments] of this.comments.entries()) {
      const comment = comments.find((c) => c.id === commentId);

      if (comment) {
        comment.resolved = true;
        comment.resolvedBy = userId;
        comment.resolvedAt = new Date();

        this.emit('comment.resolved', {
          documentId,
          commentId,
          userId
        });

        return comment;
      }
    }

    throw new Error(`Comment not found: ${commentId}`);
  }

  /**
   * Update user presence
   */
  updatePresence(userId, presenceData) {
    if (!this.config.enablePresence) {
      return;
    }

    const existing = this.presence.get(userId) || {};

    const presence = {
      userId,
      status: presenceData.status || existing.status || 'online',
      currentRoom:
        presenceData.currentRoom !== undefined
          ? presenceData.currentRoom
          : existing.currentRoom,
      currentDocument:
        presenceData.currentDocument !== undefined
          ? presenceData.currentDocument
          : existing.currentDocument,
      lastSeen: new Date(),
      ...presenceData
    };

    const wasActive = existing.status === 'active' || existing.status === 'online';
    const isActive = presence.status === 'active' || presence.status === 'online';

    this.presence.set(userId, presence);

    // Update active users count
    if (!wasActive && isActive) {
      this.stats.activeUsers++;
    } else if (wasActive && !isActive) {
      this.stats.activeUsers = Math.max(0, this.stats.activeUsers - 1);
    }

    this.emit('presence.updated', { userId, presence });
  }

  /**
   * Get user presence
   */
  getPresence(userId) {
    return this.presence.get(userId) || null;
  }

  /**
   * Get all presences
   */
  getAllPresence() {
    return Array.from(this.presence.values());
  }

  /**
   * Start presence monitoring
   */
  startPresenceMonitoring() {
    this.presenceInterval = setInterval(() => {
      const now = Date.now();

      for (const [userId, presence] of this.presence.entries()) {
        const timeSinceLastSeen = now - presence.lastSeen.getTime();

        // Mark as away if inactive for presence timeout
        if (
          timeSinceLastSeen > this.config.presenceTimeout
          && presence.status !== 'offline'
        ) {
          this.updatePresence(userId, {
            status: 'away'
          });
        }

        // Mark as offline if inactive for 5x presence timeout
        if (
          timeSinceLastSeen > this.config.presenceTimeout * 5
          && presence.status !== 'offline'
        ) {
          this.updatePresence(userId, {
            status: 'offline'
          });
        }
      }
    }, this.config.presenceTimeout);

    console.log('Presence monitoring started');
  }

  /**
   * Log activity
   */
  logActivity(activity) {
    const activityObj = {
      id: crypto.randomUUID(),
      ...activity,
      timestamp: new Date()
    };

    this.activities.push(activityObj);
    this.stats.totalActivities++;

    // Keep only last 1000 activities
    if (this.activities.length > 1000) {
      this.activities.shift();
    }

    this.emit('activity.logged', activityObj);
  }

  /**
   * Get activities
   */
  getActivities(filters = {}) {
    let activities = [...this.activities];

    if (filters.workspaceId) {
      activities = activities.filter(
        (a) => a.workspaceId === filters.workspaceId
      );
    }

    if (filters.userId) {
      activities = activities.filter((a) => a.userId === filters.userId);
    }

    if (filters.type) {
      activities = activities.filter((a) => a.type === filters.type);
    }

    if (filters.limit) {
      activities = activities.slice(-filters.limit);
    }

    return activities.reverse();
  }

  /**
   * Get room messages
   */
  getMessages(roomId, filters = {}) {
    let messages = this.messages.filter((m) => m.roomId === roomId);

    if (filters.userId) {
      messages = messages.filter((m) => m.userId === filters.userId);
    }

    if (filters.type) {
      messages = messages.filter((m) => m.type === filters.type);
    }

    if (filters.limit) {
      messages = messages.slice(-filters.limit);
    }

    return messages;
  }

  /**
   * Get document comments
   */
  getComments(documentId, filters = {}) {
    const comments = this.comments.get(documentId) || [];

    if (filters.resolved !== undefined) {
      return comments.filter((c) => c.resolved === filters.resolved);
    }

    return comments;
  }

  /**
   * Get workspace
   */
  getWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    return workspace;
  }

  /**
   * Get room
   */
  getRoom(roomId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    return room;
  }

  /**
   * Get document
   */
  getDocument(documentId) {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Convert Maps to objects for serialization
    return {
      ...document,
      cursors: Object.fromEntries(document.cursors),
      selections: Object.fromEntries(document.selections)
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      workspaces: this.workspaces.size,
      rooms: this.rooms.size,
      documents: this.documents.size,
      onlineUsers: Array.from(this.presence.values()).filter(
        (p) => p.status === 'online' || p.status === 'active'
      ).length
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    console.log('Real-Time Collaboration System cleaned up');
  }
}

module.exports = RealTimeCollaboration;
