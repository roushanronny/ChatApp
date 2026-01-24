import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    fullname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        default: "",
        sparse: true, // Allows multiple null values but unique for non-null values
    },
    password: {
        type: String,
        required: true,
    },
    confirmPassword: {
        type: String,
    },
    profilePicture: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "Hey there! I am using WhatsApp",
    },
    blockedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
}, { timestamps: true }); // createdAt & updatedAt

const User = mongoose.model("User", userSchema);
export default User;