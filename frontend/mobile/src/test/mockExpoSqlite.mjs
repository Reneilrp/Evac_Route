import { DatabaseSync } from 'node:sqlite';

export function openDatabaseSync(_name = ':memory:') {
  const memDb = new DatabaseSync(':memory:');
  return {
    execSync(sql) {
      return memDb.exec(sql);
    },
    runSync(sql, ...params) {
      return memDb.prepare(sql).run(...params);
    },
    getAllSync(sql, ...params) {
      return memDb.prepare(sql).all(...params);
    },
    prepareSync(sql) {
      const stmt = memDb.prepare(sql);
      return {
        executeSync(namedParams) {
          if (namedParams) {
            return stmt.run(namedParams);
          }
          return stmt.run();
        },
        finalizeSync() {},
      };
    },
  };
}
