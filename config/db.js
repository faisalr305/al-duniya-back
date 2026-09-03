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

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

module.exports = connectToDB;