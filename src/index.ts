import express from "express";
import { random } from "./utils";
import jwt from "jsonwebtoken";
import { ContentModel, LinkModel, UserModel } from "./db";
import { JWT_SECRET, MONGO_URI } from "./config";
import { userMiddleware } from "./middleware";
import cors from "cors";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import path from "path";

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend
app.use(express.static(path.join(__dirname, "../public")));

app.post("/api/v1/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        await UserModel.create({ username, password });
        res.json({ message: "User signed up successfully!" });
    } catch (e) {
        res.status(409).json({ message: "User already exists" });
    }
});

app.post("/api/v1/signin", async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await UserModel.findOne({ username, password });
    if (existingUser) {
        const token = jwt.sign({ id: existingUser._id }, JWT_SECRET);
        res.json({ token });
    } else {
        res.status(403).json({ message: "Incorrect credentials" });
    }
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
    const { link, type, title } = req.body;
    try {
        await ContentModel.create({
            link,
            type,
            title,
            //@ts-ignore
            userId: req.userId,
            tags: []
        });
        res.json({ message: "Content added successfully" });
    } catch (e) {
        res.status(500).json({ message: "Failed to add content" });
    }
});

app.get("/api/v1/content", userMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId;
    const content = await ContentModel.find({ userId }).populate("userId", "username");
    res.json({ content });
});

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
    const contentId = req.body.contentId;
    //@ts-ignore
    await ContentModel.deleteOne({ _id: contentId, userId: req.userId });
    res.json({ message: "Deleted successfully" });
});

app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
    const { share } = req.body;
    //@ts-ignore
    const userId = req.userId;
    if (share) {
        const existingLink = await LinkModel.findOne({ userId });
        if (existingLink) {
            res.json({ hash: existingLink.hash });
            return;
        }
        const hash = random(10);
        await LinkModel.create({ userId, hash });
        res.json({ hash });
    } else {
        await LinkModel.deleteOne({ userId });
        res.json({ message: "Removed share link" });
    }
});

app.get("/api/v1/brain/:shareLink", async (req, res) => {
    const hash = req.params.shareLink;
    const link = await LinkModel.findOne({ hash });
    if (!link) {
        res.status(404).json({ message: "Invalid share link" });
        return;
    }
    const content = await ContentModel.find({ userId: link.userId });
    const user = await UserModel.findOne({ _id: link.userId });

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
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

async function main() {
    const PORT = Number(process.env.PORT) || 3000;
    let uri = MONGO_URI;

    if (!uri) {
        try {
            console.log("No MONGO_URI provided. Starting temporary In-Memory Database...");
            const mongoServer = await MongoMemoryServer.create();
            uri = mongoServer.getUri();
        } catch (memErr) {
            console.warn("Could not start in-memory database, proceeding with fallback.");
        }
    }

    if (uri) {
        try {
            await mongoose.connect(uri);
            console.log("✅ Connected to MongoDB Database");
        } catch (e) {
            console.error("❌ Database connection error:", e);
        }
    } else {
        console.warn("⚠️ No database connection string provided. Run with MONGO_URI in production.");
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

main();
