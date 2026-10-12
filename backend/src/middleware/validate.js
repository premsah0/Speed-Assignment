/**
 * Generic Validation Middleware using Zod schemas for body, query, or params.
 * @param {ZodSchema} schema - Zod validation schema.
 * @param {'body' | 'query' | 'params'} target - Request object property to validate.
 */
export const validate = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target]);
  if (!result.success) {
    const issueMessages = result.error.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({
      success: false,
      message: issueMessages || 'Validation error',
      errors: result.error.flatten().fieldErrors,
    });
  }

  if (target === 'body') {
    req.body = result.data;
  } else if (target === 'query') {
    // In Express 5 req.query is a getter; copy validated properties onto req.query
    Object.assign(req.query, result.data);
  } else if (target === 'params') {
    Object.assign(req.params, result.data);
  }

  next();
};
