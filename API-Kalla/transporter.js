const nodemailer=require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user:'kallatracking01@gmail.com',
        pass:'syhnwwucpdjzgtpq',
    },
});
transporter.verify((error,success)=>{
    if(error){
      console.log(error)
    }
    else{
      console.log("ready for messages")
      console.log(success)
    }
  })
module.exports=transporter;