// Brute-force protection for credential endpoints.
//
// The guardian portal is the softest target in the API: it authenticates with a
// 4-digit PIN (10,000 possibilities) against an academic number that is short
// and sequential, and a success returns a 12h token covering a student's
// results, evaluations, behavior records and fees. bcrypt alone is not a
// meaningful brake at that keyspace, so the endpoint is limited on two
// independent axes — both must pass:
//
//   • per-IP      — stops one host walking the keyspace
//   • per-account — stops a distributed attack concentrating on one student
//
// Counters are in-memory, so they are per-process: running multiple instances
// multiplies the effective allowance. Move to a shared store (Redis) if this
// ever scales out horizontally.
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Arabic to match the guardian controller's user-facing messages.
const tooManyAttempts = (req, res) =>
  res.status(429).json({
    success: false,
    message: "محاولات تسجيل دخول كثيرة. الرجاء المحاولة لاحقاً.",
  });

const base = {
  windowMs: WINDOW_MS,
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  // Only failed attempts count, so a guardian logging in normally never
  // burns through their own allowance.
  skipSuccessfulRequests: true,
  handler: tooManyAttempts,
};

// One host gets 20 failed guardian logins per window. Generous enough for a
// family behind a shared NAT, far too few to search a 4-digit PIN.
const guardianLoginIpLimiter = rateLimit({
  ...base,
  limit: 20,
  // ipKeyGenerator takes the IP *string* and normalises IPv6 down to a subnet
  // key; a bare req.ip would let an attacker with an IPv6 range rotate past the
  // limit one address at a time.
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// Any single student's PIN can only be guessed 10 times per window, no matter
// how many IPs the attempts come from: ~40/hour against 10,000 combinations.
const guardianLoginAccountLimiter = rateLimit({
  ...base,
  limit: 10,
  keyGenerator: (req) => `acct:${String(req.body?.academicNumber ?? "")}`,
  // Requests with no academic number are rejected by the controller's own
  // validation; don't let them share (and exhaust) a single "" bucket.
  skip: (req) => !req.body?.academicNumber,
});

// Generic limiter for password logins. Not currently wired to /auth/login —
// enable it there deliberately, since a limit that is too tight locks out real
// users of an endpoint the frontend already depends on.
const loginLimiter = rateLimit({
  ...base,
  limit: 20,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (req, res) =>
    res
      .status(429)
      .json({ msg: "Too many login attempts. Please try again later." }),
});

module.exports = {
  guardianLoginIpLimiter,
  guardianLoginAccountLimiter,
  loginLimiter,
};
