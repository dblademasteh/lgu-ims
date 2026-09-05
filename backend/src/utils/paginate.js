function paginate(q = {}) {
  const page = Math.max(Number(q.page) || 1, 1);
  const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { paginate };