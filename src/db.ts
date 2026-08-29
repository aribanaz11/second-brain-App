import mongoose, { model, Schema } from "mongoose";

const UserSchema = new Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});

export const UserModel = model("User", UserSchema);

const ContentSchema = new Schema({
    title: { type: String, required: true },
    link: { type: String, required: true },
    type: { type: String, enum: ["youtube", "twitter", "article", "note", "other"], default: "note" },
    tags: [{ type: mongoose.Types.ObjectId, ref: "tag" }],
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
});

export const ContentModel = model("Content", ContentSchema);

const LinkSchema = new Schema({
    hash: { type: String, required: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
});

export const LinkModel = model("Links", LinkSchema);