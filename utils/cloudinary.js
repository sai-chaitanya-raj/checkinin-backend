const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const config = require("../config");

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "checkin_avatars", // Cloudinary folder name
        allowed_formats: ["jpg", "png", "webp", "jpeg"],
        transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
    },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
