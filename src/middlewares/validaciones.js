const { body, validationResult } = require('express-validator');

// Middleware para validar producto
const validarProducto = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('precio').isFloat({ gt: 0 }).withMessage('El precio debe ser un número positivo'),
  body('stock').isInt({ min: 0 }).withMessage('El stock debe ser un entero positivo'),
  // Puedes agregar más validaciones según tu esquema
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }
    next();
  }
];

// Middleware para validar registro de usuario
const validarUsuarioRegistro = [
  body('email').isEmail().withMessage('Debe ser un email válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = { validarProducto, validarUsuarioRegistro };
