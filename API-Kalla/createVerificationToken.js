const jwt=require('jsonwebtoken')

const createVerificationToken=(user)=>{
    const payload ={email:user.email}
    const secretKey='Kalla-verification'
    const options={expiresIn:'2h'}

    return jwt.sign(payload,secretKey,options)
}

module.exports=createVerificationToken;