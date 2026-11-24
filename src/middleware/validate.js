import { validationResult } from "express-validator";

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return res.status(422).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

export default validate;
