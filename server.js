const app = require('./app.js')
const connectToDB = require('./config/db.js')

// Connect to the database before accepting requests. If MongoDB is
// unreachable (e.g. MONGODB_URI missing/wrong on Render), still start the
// HTTP server but surface the problem clearly:
//   - GET /api/health reports { "status": "error", "database": "disconnected" }
//   - data queries fail fast with a clear message (bufferCommands: false)
//     instead of queuing for 10s and returning "buffering timed out".
async function startServer() {
    const PORT = process.env.PORT || 3000;

    try {
        await connectToDB();
    } catch (error) {
        console.error("WARNING: could not connect to MongoDB:", error.message);
        console.error(
            "API will still start, but data endpoints will return errors until",
        );
        console.error(
            "MONGODB_URI is set to a reachable database (e.g. MongoDB Atlas).",
        );
    }

    app.listen(PORT, () => {
        console.log(`App is running on port ${PORT}`);
    });
}
startServer();