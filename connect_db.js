const mongoose = require('mongoose');
 function connect (){

    // kirar is the name of project in mongoDB and kirar is password and blogdb is the name of database
    const uri = 'mongodb+srv://kirar:kirar@cluster0.v3gymhf.mongodb.net/blogdb?retryWrites=true&w=majority'
    try{
         mongoose.connect(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
        const connection = mongoose.connection;
        connection.once('open', () => {
        console.log("MongoDB database connection established successfully");
        })
    }catch(e){
        console.log(e);
    }
}

module.exports = connect;