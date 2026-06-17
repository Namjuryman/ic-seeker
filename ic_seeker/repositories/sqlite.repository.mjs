export function createSqliteRepository({ openDb }) {
  function connect(options = {}) {
    return openDb(options);
  }

  function withDb(callback, options = {}) {
    const db = connect(options);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  return { connect, withDb };
}
