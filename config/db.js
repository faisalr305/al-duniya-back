const mongoose = require("mongoose");

async function connectToDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to the server environment. " +
        "Locally: create a .env file (see README / .env.example). " +
        "On Render: Dashboard > your service > Environment > add MONGODB_URI " +
        "with a reachable connection string (e.g. MongoDB Atlas).",
    );
  }

  // bufferCommands: false -> if the DB is unavailable, queries fail
  // immediately instead of queueing for 10s and then timing out with an
  // opaque "buffering timed out" error.
  await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });

  const { name } = mongoose.connection;
  console.log(`Connected to Database: ${name}`);
}

// Resolves as soon as Mongo is ready (readyState 1), or rejects after
// `timeoutMs`. Used by the API middleware so a request that arrives while the
// initial connection is still being established (e.g. a Render cold start)
// simply waits for it instead of failing with Mongoose's
// "Cannot call X before initial connection is complete if bufferCommands = false"
// error.
function waitForDatabase(timeoutMs = 10000) {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      mongoose.connection.off("connected", onConnected);
      mongoose.connection.off("error", onError);
    };
    const onConnected = () => {
      cleanup();
      resolve();
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onTimeout = () => {
      cleanup();
      const err = new Error(
        "Database is not connected yet. Check /api/health and confirm MONGODB_URI is reachable.",
      );
      err.code = "DB_NOT_CONNECTED";
      reject(err);
    };

    timer = setTimeout(onTimeout, timeoutMs);
    mongoose.connection.once("connected", onConnected);
    mongoose.connection.once("error", onError);
  });
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

module.exports = connectToDB;
module.exports.waitForDatabase = waitForDatabase;