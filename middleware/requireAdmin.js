// PLACEHOLDER: the real auth/role check belongs to the auth task.
// Right now it lets every request through so the routes can be tested.
export const requireAdmin = (req, res, next) => {
  // TODO: replace with real admin check once the User model and auth middleware exist
  next();
};