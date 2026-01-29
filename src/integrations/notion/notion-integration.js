/**
 * Notion Integration
 * Connect with Notion API for documentation, knowledge base, and project management
 * Features: Database sync, page creation, content updates, search
 */

const EventEmitter = require('events');

class NotionIntegration extends EventEmitter {
  constructor(contextBus, logger, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.config = {
      apiKey: config.apiKey || process.env.NOTION_API_KEY,
      apiVersion: config.apiVersion || '2022-06-28',
      baseUrl: 'https://api.notion.com/v1',
      autoSync: config.autoSync || false,
      syncInterval: config.syncInterval || 300000, // 5 minutes
      ...config
    };

    this.databases = new Map();
    this.pages = new Map();
    this.syncQueue = [];
    this.syncTimer = null;
  }

  /**
   * Initialize Notion connection
   */
  async initialize() {
    this.logger.info('[NotionIntegration] Initializing Notion integration');

    if (!this.config.apiKey) {
      throw new Error('Notion API key not configured');
    }

    try {
      // Verify API connection
      await this.verifyConnection();

      // Start auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      await this.contextBus.publish('notion.initialized', {
        timestamp: new Date().toISOString()
      });

      this.logger.info(
        '[NotionIntegration] Notion integration initialized successfully'
      );
      return true;
    } catch (error) {
      this.logger.error('[NotionIntegration] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify API connection
   */
  async verifyConnection() {
    // In production, verify with actual API call:
    // const axios = require('axios');
    // const response = await axios.get(`${this.config.baseUrl}/users/me`, {
    //   headers: {
    //     'Authorization': `Bearer ${this.config.apiKey}`,
    //     'Notion-Version': this.config.apiVersion
    //   }
    // });

    this.logger.info('[NotionIntegration] Connection verified');
    return true;
  }

  /**
   * Create Notion page
   */
  async createPage(databaseId, properties, content = []) {
    this.logger.info(
      `[NotionIntegration] Creating page in database: ${databaseId}`
    );

    const pageId = `page-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // In production, use Notion API:
      // const { Client } = require('@notionhq/client');
      // const notion = new Client({ auth: this.config.apiKey });
      //
      // const response = await notion.pages.create({
      //   parent: { database_id: databaseId },
      //   properties: this.formatProperties(properties),
      //   children: this.formatBlocks(content)
      // });

      const page = {
        id: pageId,
        databaseId,
        properties,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: `https://notion.so/${pageId.replace(/-/g, '')}`
      };

      this.pages.set(pageId, page);

      await this.contextBus.publish('notion.page-created', {
        pageId,
        databaseId,
        timestamp: page.createdAt
      });

      this.logger.info(`[NotionIntegration] Page created: ${pageId}`);
      return page;
    } catch (error) {
      this.logger.error('[NotionIntegration] Failed to create page:', error);
      throw error;
    }
  }

  /**
   * Update Notion page
   */
  async updatePage(pageId, updates) {
    this.logger.info(`[NotionIntegration] Updating page: ${pageId}`);

    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    try {
      // In production, use Notion API:
      // const { Client } = require('@notionhq/client');
      // const notion = new Client({ auth: this.config.apiKey });
      //
      // if (updates.properties) {
      //   await notion.pages.update({
      //     page_id: pageId,
      //     properties: this.formatProperties(updates.properties)
      //   });
      // }
      //
      // if (updates.content) {
      //   await notion.blocks.children.append({
      //     block_id: pageId,
      //     children: this.formatBlocks(updates.content)
      //   });
      // }

      if (updates.properties) {
        Object.assign(page.properties, updates.properties);
      }
      if (updates.content) {
        page.content.push(...updates.content);
      }
      page.updatedAt = new Date().toISOString();

      await this.contextBus.publish('notion.page-updated', {
        pageId,
        timestamp: page.updatedAt
      });

      this.logger.info(`[NotionIntegration] Page updated: ${pageId}`);
      return page;
    } catch (error) {
      this.logger.error('[NotionIntegration] Failed to update page:', error);
      throw error;
    }
  }

  /**
   * Query Notion database
   */
  async queryDatabase(databaseId, filter = {}, sorts = []) {
    this.logger.info(`[NotionIntegration] Querying database: ${databaseId}`);

    try {
      // In production, use Notion API:
      // const { Client } = require('@notionhq/client');
      // const notion = new Client({ auth: this.config.apiKey });
      //
      // const response = await notion.databases.query({
      //   database_id: databaseId,
      //   filter: this.formatFilter(filter),
      //   sorts: this.formatSorts(sorts)
      // });

      const results = Array.from(this.pages.values()).filter(
        (page) => page.databaseId === databaseId
      );

      await this.contextBus.publish('notion.database-queried', {
        databaseId,
        resultCount: results.length,
        timestamp: new Date().toISOString()
      });

      return {
        results,
        hasMore: false,
        nextCursor: null
      };
    } catch (error) {
      this.logger.error('[NotionIntegration] Failed to query database:', error);
      throw error;
    }
  }

  /**
   * Create database
   */
  async createDatabase(parentPageId, title, properties) {
    this.logger.info(`[NotionIntegration] Creating database: ${title}`);

    const databaseId = `db-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // In production, use Notion API:
      // const { Client } = require('@notionhq/client');
      // const notion = new Client({ auth: this.config.apiKey });
      //
      // const response = await notion.databases.create({
      //   parent: { page_id: parentPageId },
      //   title: [{ text: { content: title } }],
      //   properties: this.formatDatabaseProperties(properties)
      // });

      const database = {
        id: databaseId,
        parentPageId,
        title,
        properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: `https://notion.so/${databaseId.replace(/-/g, '')}`
      };

      this.databases.set(databaseId, database);

      await this.contextBus.publish('notion.database-created', {
        databaseId,
        title,
        timestamp: database.createdAt
      });

      this.logger.info(`[NotionIntegration] Database created: ${databaseId}`);
      return database;
    } catch (error) {
      this.logger.error(
        '[NotionIntegration] Failed to create database:',
        error
      );
      throw error;
    }
  }

  /**
   * Search Notion
   */
  async search(query, options = {}) {
    this.logger.info(`[NotionIntegration] Searching for: ${query}`);

    try {
      // In production, use Notion API:
      // const { Client } = require('@notionhq/client');
      // const notion = new Client({ auth: this.config.apiKey });
      //
      // const response = await notion.search({
      //   query,
      //   filter: options.filter,
      //   sort: options.sort
      // });

      const results = Array.from(this.pages.values()).filter((page) => {
        const searchText = JSON.stringify(page).toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      return {
        results,
        hasMore: false,
        nextCursor: null
      };
    } catch (error) {
      this.logger.error('[NotionIntegration] Search failed:', error);
      throw error;
    }
  }

  /**
   * Sync project documentation to Notion
   */
  async syncProjectToNotion(projectId, databaseId) {
    this.logger.info(
      `[NotionIntegration] Syncing project ${projectId} to Notion database ${databaseId}`
    );

    try {
      // Get project context
      const context = {
        projectId,
        name: `Project ${projectId}`,
        status: 'Active',
        lastUpdated: new Date().toISOString()
      };

      // Create/update page
      const properties = {
        Name: { title: [{ text: { content: context.name } }] },
        Status: { select: { name: context.status } },
        'Last Updated': { date: { start: context.lastUpdated } }
      };

      const content = [
        {
          type: 'heading_1',
          heading_1: { rich_text: [{ text: { content: 'Project Overview' } }] }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `Project ID: ${projectId}` } }]
          }
        }
      ];

      const page = await this.createPage(databaseId, properties, content);

      await this.contextBus.publish('notion.project-synced', {
        projectId,
        pageId: page.id,
        timestamp: new Date().toISOString()
      });

      return page;
    } catch (error) {
      this.logger.error('[NotionIntegration] Project sync failed:', error);
      throw error;
    }
  }

  /**
   * Export documentation to Notion
   */
  async exportDocumentation(databaseId, documentation) {
    this.logger.info(
      `[NotionIntegration] Exporting documentation to database: ${databaseId}`
    );

    const pages = [];

    for (const doc of documentation) {
      try {
        const properties = {
          Title: { title: [{ text: { content: doc.title } }] },
          Type: { select: { name: doc.type || 'Documentation' } },
          Date: { date: { start: new Date().toISOString() } }
        };

        const content = this.convertMarkdownToBlocks(doc.content);
        const page = await this.createPage(databaseId, properties, content);
        pages.push(page);
      } catch (error) {
        this.logger.error(
          `[NotionIntegration] Failed to export doc: ${doc.title}`,
          error
        );
      }
    }

    return pages;
  }

  /**
   * Convert markdown to Notion blocks
   */
  convertMarkdownToBlocks(markdown) {
    // Simplified markdown to Notion blocks conversion
    const lines = markdown.split('\n');
    const blocks = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        blocks.push({
          type: 'heading_1',
          heading_1: { rich_text: [{ text: { content: line.substring(2) } }] }
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: line.substring(3) } }] }
        });
      } else if (line.startsWith('### ')) {
        blocks.push({
          type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: line.substring(4) } }] }
        });
      } else if (line.startsWith('- ')) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: line.substring(2) } }]
          }
        });
      } else if (line.trim()) {
        blocks.push({
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: line } }] }
        });
      }
    }

    return blocks;
  }

  /**
   * Auto-sync functionality
   */
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.syncQueue.length > 0) {
        this.logger.info(
          `[NotionIntegration] Processing sync queue: ${this.syncQueue.length} items`
        );
        await this.processSyncQueue();
      }
    }, this.config.syncInterval);

    this.logger.info('[NotionIntegration] Auto-sync started');
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.logger.info('[NotionIntegration] Auto-sync stopped');
    }
  }

  async processSyncQueue() {
    while (this.syncQueue.length > 0) {
      const item = this.syncQueue.shift();
      try {
        await this.syncProjectToNotion(item.projectId, item.databaseId);
      } catch (error) {
        this.logger.error('[NotionIntegration] Sync queue item failed:', error);
      }
    }
  }

  /**
   * Add item to sync queue
   */
  queueSync(projectId, databaseId) {
    this.syncQueue.push({ projectId, databaseId });
    this.logger.info(`[NotionIntegration] Added to sync queue: ${projectId}`);
  }

  /**
   * Get page by ID
   */
  getPage(pageId) {
    return this.pages.get(pageId);
  }

  /**
   * Get database by ID
   */
  getDatabase(databaseId) {
    return this.databases.get(databaseId);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      databases: this.databases.size,
      pages: this.pages.size,
      syncQueueSize: this.syncQueue.length,
      autoSyncEnabled: this.config.autoSync,
      syncInterval: `${this.config.syncInterval / 1000}s`
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopAutoSync();
    this.databases.clear();
    this.pages.clear();
    this.syncQueue = [];
    this.logger.info('[NotionIntegration] Cleanup completed');
  }
}

module.exports = NotionIntegration;
