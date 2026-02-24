const { validationResult } = require("express-validator");

function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const msg = errors.array().map((e) => e.msg).join("; ");
    return res.status(400).json({ success: false, message: msg });
  };
}

module.exports = { validate };
