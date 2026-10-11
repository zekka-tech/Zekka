/**
 * db_introspect tool - read-only database schema introspection.
 *
 * Lets an agent discover tables and columns before writing data-access code,
 * without granting arbitrary SQL. A query runner is injected via `ctx.dbQuery`
 * (`ctx.dbQuery(sql, params) => { rows }`) so the tool is testable and so the
 * caller controls which (ideally read-only) connection is used.
 *
 * Only information_schema reads are issued — never DDL/DML.
 *
 * @module orchestrator/tools/db-introspect.tool
 */

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const dbIntrospectTool = {
  name: 'db_introspect',
  description:
    'Inspect the database schema (read-only). args: { table?: string }. '
    + 'Without a table, lists public tables; with a table, lists its columns.',
  schema: {
    table: { type: 'string', required: false }
  },

  async run(args, ctx = {}) {
    const { dbQuery } = ctx;
    if (typeof dbQuery !== 'function') {
      return { ok: false, error: 'no dbQuery runner available in context' };
    }

    try {
      if (!args.table) {
        const { rows } = await dbQuery(
          `SELECT table_name
           FROM information_schema.tables
           WHERE table_schema = 'public'
           ORDER BY table_name`
        );
        return { ok: true, output: { tables: rows.map((r) => r.table_name) } };
      }

      if (!IDENTIFIER.test(args.table)) {
        return { ok: false, error: `invalid table name: ${args.table}` };
      }

      const { rows } = await dbQuery(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [args.table]
      );
      if (rows.length === 0) {
        return { ok: false, error: `table not found: ${args.table}` };
      }
      return {
        ok: true,
        output: {
          table: args.table,
          columns: rows.map((r) => ({
            name: r.column_name,
            type: r.data_type,
            nullable: r.is_nullable === 'YES',
            default: r.column_default
          }))
        }
      };
    } catch (err) {
      return { ok: false, error: `introspection failed: ${err.message}` };
    }
  }
};

module.exports = { dbIntrospectTool };
