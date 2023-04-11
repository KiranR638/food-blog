const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
    title:String,
    description:String,
    post_image:String,
    user_id:mongoose.Schema.ObjectId,
    isAdmin:Boolean,
    date:String
});

module.exports = mongoose.model("Post",PostSchema);