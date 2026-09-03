const app = require('./app.js')
const connectToDB = require('./config/db.js')

const PORT = process.env.PORT || 3000;
const CONNECT_RETRY_MS = 10000; // try to (re)connect every 10s

// Start the HTTP server immediately so /api/health can always report
// database state. Then keep trying to connect to MongoDB in the background:
//   - If MONGODB_URI is missing/wrong, the server stays up but data
//     endpoints return a clear error (bufferCommands: false => no 10s hangs).
//   - The instant MONGODB_URI becomes reachable, the connection succeeds
//     without needing a service restart.
let connecting = false;

async function connectWithRetry() {
  if (connecting) return;
  connecting = true;
  try {
    await connectToDB();
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    console.error(`API still running, but data endpoints will error until MongoDB is reachable. Retrying in ${CONNECT_RETRY_MS / 1000}s...`);
    setTimeout(connectWithRetry, CONNECT_RETRY_MS);
  } finally {
    connecting = false;
  }
}

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});

connectWithRetry();