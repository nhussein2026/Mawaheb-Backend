// Small pagination helper shared by institute list endpoints so every module
// returns the same envelope: { success, total, page, pages, limit, data }.

function getPageParams(req, defaultLimit = 10) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1);
  return { page, limit, skip: (page - 1) * limit };
}

function pagedResponse({ data, total, page, limit }) {
  return {
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    limit,
    data,
  };
}

module.exports = { getPageParams, pagedResponse };
