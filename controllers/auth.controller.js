const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getCookie = (req, name) =>
  (req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([key]) => key === name)?.slice(1).join("=");

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/auth",
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

const issueSession = async (user, res) => {
  const accessToken = jwt.sign(
    { username: user.username, _id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
  const refreshToken = jwt.sign({ _id: user._id }, refreshSecret, {
    expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
  });

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie("refreshToken", refreshToken, cookieOptions());
  return accessToken;
};

async function signUp(req, res) {
  try {
    const { username, email, fullName, password } = req.body;
    const identity = (email || username || "").toLowerCase().trim();

    // Validation
    if (!identity || !password) return res.status(400).json({message: email ? "Email and password are required." : "Username and password are required.",});
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 8) return res.status(400).json({message: "Password must be at least 8 characters.",});

    const user = await User.create({
      username: identity,
      fullName: fullName?.trim(),
      hashedPassword: await bcrypt.hash(password, 12),
    });

    const { _id, createdAt, updatedAt } = user;

    res
      .status(201)
      .json({ username: user.username, _id, createdAt, updatedAt });
  } catch (err) {
    console.log(err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: err.message,
      });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    console.log(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function signIn(req, res) {
  try {
    const { username, email, password } = req.body;
    const identity = (email || username || "").toLowerCase().trim();

    if (!identity || !password) {
      return res.status(400).json({
        message: "Username and password are required.",
      });
    }
    const user = await User.findOne({ username: identity });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword,
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const accessToken = await issueSession(user, res);
    return res.status(200).json({
      accessToken,
      user: {
        _id: user._id,
        username: user.username, fullName: user.fullName,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = getCookie(req, "refreshToken");
    if (!refreshToken) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const payload = jwt.verify(refreshToken, refreshSecret);
    const user = await User.findById(payload._id).select("+refreshTokenHash");
    if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    return res.status(200).json({ accessToken: await issueSession(user, res) });
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

async function logout(req, res) {
  try {
    const refreshToken = getCookie(req, "refreshToken");
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, refreshSecret);
      await User.findByIdAndUpdate(payload._id, { $unset: { refreshTokenHash: 1 } });
    }
  } catch {
    // The client cookie may already be invalid; it still needs clearing.
  }

  res.clearCookie("refreshToken", cookieOptions());
  return res.status(204).end();
}

async function verifyUser(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
        _id: user._id,
        username: user.username, fullName: user.fullName,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  signUp,
  signIn,
  refresh,
  logout,
  verifyUser,
};
