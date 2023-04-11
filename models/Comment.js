const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    comment_content:String,
    username:String,
    user_id:mongoose.Schema.ObjectId,
    post_id:mongoose.Schema.ObjectId,
});

module.exports = mongoose.model("Comment",CommentSchema);