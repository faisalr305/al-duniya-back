const app = require('./app.js')
const connectToDB = require('./config/db.js')

// Connect to the database before accepting requests. If the database is
// unreachable (e.g. MONGODB_URI is missing or wrong on Render), fail fast
// with a clear message instead of serving requests that all time out.
async function startServer() {
    const PORT = process.env.PORT || 3000;

    try {
        await connectToDB();
    } catch (error) {
        console.error("Failed to start: could not connect to MongoDB.");
        console.error(error.message);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`App is running on port ${PORT}`);
    });
}
startServer();