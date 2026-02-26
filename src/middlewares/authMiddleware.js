const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ ok: false, error: 'Token requerido' });

  jwt.verify(token, process.env.SECRETO_JWT, (err, user) => {
    if (err) return res.status(403).json({ ok: false, error: 'Token inválido' });
    req.user = user;
    next();
  });
}

module.exports = autenticarToken;
