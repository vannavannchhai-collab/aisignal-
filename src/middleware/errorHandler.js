'use strict';
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ success: false, error: { code: err.code || 'ERROR', message: err.message || 'Internal error' } });
};
function asyncWrap(fn){ return (req,res,next)=> Promise.resolve(fn(req,res,next)).catch(next); }
module.exports.asyncWrap = asyncWrap;
