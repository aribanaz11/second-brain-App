"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utils_1 = require("./utils");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./db");
const config_1 = require("./config");
const middleware_1 = require("./middleware");
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Serve static frontend
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
app.post("/api/v1/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        await db_1.UserModel.create({ username, password });
        res.json({ message: "User signed up successfully!" });
    }
    catch (e) {
        res.status(409).json({ message: "User already exists" });
    }
});
app.post("/api/v1/signin", async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await db_1.UserModel.findOne({ username, password });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({ id: existingUser._id }, config_1.JWT_SECRET);
        res.json({ token });
    }
    else {
        res.status(403).json({ message: "Incorrect credentials" });
    }
});
app.post("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    const { link, type, title } = req.body;
    try {
        await db_1.ContentModel.create({
            link,
            type,
            title,
            //@ts-ignore
            userId: req.userId,
            tags: []
        });
        res.json({ message: "Content added successfully" });
    }
    catch (e) {
        res.status(500).json({ message: "Failed to add content" });
    }
});
app.get("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId;
    const content = await db_1.ContentModel.find({ userId }).populate("userId", "username");
    res.json({ content });
});
app.delete("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    const contentId = req.body.contentId;
    //@ts-ignore
    await db_1.ContentModel.deleteOne({ _id: contentId, userId: req.userId });
    res.json({ message: "Deleted successfully" });
});
app.post("/api/v1/brain/share", middleware_1.userMiddleware, async (req, res) => {
    const { share } = req.body;
    //@ts-ignore
    const userId = req.userId;
    if (share) {
        const existingLink = await db_1.LinkModel.findOne({ userId });
        if (existingLink) {
            res.json({ hash: existingLink.hash });
            return;
        }
        const hash = (0, utils_1.random)(10);
        await db_1.LinkModel.create({ userId, hash });
        res.json({ hash });
    }
    else {
        await db_1.LinkModel.deleteOne({ userId });
        res.json({ message: "Removed share link" });
    }
});
app.get("/api/v1/brain/:shareLink", async (req, res) => {
    const hash = req.params.shareLink;
    const link = await db_1.LinkModel.findOne({ hash });
    if (!link) {
        res.status(404).json({ message: "Invalid share link" });
        return;
    }
    const content = await db_1.ContentModel.find({ userId: link.userId });
    const user = await db_1.UserModel.findOne({ _id: link.userId });
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    res.json({
        username: user.username,
        content
    });
});
// Fallback to React/Vanilla SPA router
app.use((req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
async function main() {
    const PORT = Number(process.env.PORT) || 3000;
    let uri = config_1.MONGO_URI;
    if (!uri) {
        try {
            console.log("No MONGO_URI provided. Starting temporary In-Memory Database...");
            const mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
            uri = mongoServer.getUri();
        }
        catch (memErr) {
            console.warn("Could not start in-memory database, proceeding with fallback.");
        }
    }
    if (uri) {
        try {
            await mongoose_1.default.connect(uri);
            console.log("✅ Connected to MongoDB Database");
        }
        catch (e) {
            console.error("❌ Database connection error:", e);
        }
    }
    else {
        console.warn("⚠️ No database connection string provided. Run with MONGO_URI in production.");
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}
main();
//# sourceMappingURL=index.js.map