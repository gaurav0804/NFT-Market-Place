
var express = require("express")
var bodyParser = require("body-parser")
var mongoose = require("mongoose")
mongoose.pluralize(null);
var fs = require('fs');

const nodemon = require("nodemon")
var Web3 = require("web3")
const { redirect } = require("express/lib/response")
const res = require("express/lib/response")

var ObjectId = require('mongoose').Types.ObjectId;

var web3 = new Web3(new Web3.providers.HttpProvider('https://data-seed-prebsc-1-s1.binance.org:8545'));

var obj = JSON.parse(fs.readFileSync('BloggerNFT.json', 'utf8'));
var abi = obj.abi;

var contract_address = '0x694d7dF1760F2D24fa5F776d763BcdcFA781036d'
var contract_owner = '0x3b7d9A28187Ccf6EE1dbda88c788C886B419767b'
var contract_private = '8669375185af1b3f0d51473d4963a3981cb4b9b3b308e860c1f24230cf9785e1'
// var contract_address = "0xEFAF03d165fB28EA2722D9803Bc775589d8463A2"
// var contract_owner = "0x86ba244a5322c961695c3b6A46b26E81199473D2"
// var contract_private = "da10d9184bbe9de28847f3103dc6a9e15f842c2a8cd0dfca23f1a8d9be1b75b6"

const contract = new web3.eth.Contract(abi=abi,address=contract_address)

const app = express()

app.set("view engine","ejs")


app.use(bodyParser.json())
//app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended:true
}))

mongoose.connect('mongodb://localhost:27017/nftblogger',{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

var db = mongoose.connection;
const tokenSchema = new mongoose.Schema({ address: String, tokenId: String, url: String, year: Number });
const Tokens = mongoose.model('tokens',tokenSchema);

db.on('error',()=>console.log("Error in Connecting to Database"));
db.once('open',()=>console.log("Connected to Database"))

app.get("/sign_up",(req,res)=>{
    try{
    res.set({
        "Allow-access-Allow-Origin": '*'
    })
} catch(e){console.log(e)}
    res.render('signup')
})

app.get("/login",(req,res)=>{
    try{
    res.set({
        "Allow-access-Allow-Origin": '*'
    })
} catch(e){console.log(e)}
    res.render('login')
})

app.post("/sign_up",(req,res,next)=>{
    try{
    var name = req.body.name;
    var email = req.body.email;
    var phno = req.body.phno;
    var password = req.body.password;

    var data = {
        "name": name,
        "email" : email,
        "phno": phno,
        "password" : password,
        }

    db.collection('users').count({"email" : email}, function (findErr, result) {
        if (findErr) throw findErr;
        
        if (result>0){
            
            return res.redirect('signup_fail')
            }
        else{
            var act = web3.eth.accounts.create()
                        
            data.address = act.address;
            db.collection('users').insertOne(data,(err,collection)=>{
                if(err){
                    throw err;
                }
                console.log("Record Inserted Successfully");
            });
 
            return res.render('signup_success',{address : act.address, private : act.privateKey})
        }
        
      });} catch(e){console.log(e)}
})

app.post("/login",(req,res,next)=>{
    try{
    
    var email = req.body.email;
    var password = req.body.password;

    db.collection('users').count({"email" : email}, function (findErr, result) {
        if (findErr) throw findErr;
        if (result<1){
            res.redirect('loginfail')
        }

        else{
            db.collection('users').findOne({"email" : email}, function (findErr, result){
                if (findErr) throw findErr;

                _id = result._id.toString()
                userpassword = result.password

                if(userpassword==password){
                    res.redirect('home?_id='+_id)
                }
                else{
                    res.redirect('loginfail')
                }
            })
        }
    })
} catch(e){console.log(e)}
    
})

app.get("/loginfail",(req,res)=>{

    res.render('loginfail')
})

app.get("/home",(req,res)=>{
    try{
    var _id = req.query._id

    db.collection("users").findOne({"_id":ObjectId(_id)},function(findErr, result){
        if(findErr) throw findErr;

        var username = result.name
        var account = result.address

        var filter = {'address':account};
        var tokens;
        db.collection('tokens').find(filter).toArray(function(err,info){
            tokens = info;
            (async()=>{
                var balanceWei = await web3.eth.getBalance(account)
                var balance = await web3.utils.fromWei(balanceWei,'ether')

                res.render('home',{username : username, tokens: tokens,_id:_id, balance: balance, account: account})
            })();
            
        });
        

        
    })
} catch(e){console.log(e)}
})

app.post("/home",(req,res)=>{
    try{
    var _id = req.query._id
    var private = req.body.private
    var url = req.body.url
    var year = parseInt(req.body.year)
    var price = req.body.price
    
    var fromAccountDetails= web3.eth.accounts.wallet.add(private)
    var fromAccount = fromAccountDetails.address

    
    var query = query = {$and:[{url:url},{year:year}]}

    db.collection('tokens').count(query, function (findErr, result) {
        if (findErr) throw findErr;
        if(result>0){
            res.redirect('tokencreate_fail?_id='+_id)
        }
        else{
            console.log('n0')

            var tokenId;
            db.collection('tokens').insertOne({'address':fromAccount,'url':url,'year':year,'price':price});
            (async()=>{
                var nonce = await web3.eth.getTransactionCount(fromAccount)
                console.log('n1')
                var encoded = contract.methods.mint_external(url,web3.utils.toWei(price,'ether'),year).encodeABI()
                console.log('n2')
                var tx = {
                    to : contract_address,
                    data : encoded,
                    value : web3.utils.toWei('0.1','ether').toString(),
                    gas : 300000,
                    nonce : nonce
                }
                try{
                var signed = await web3.eth.accounts.signTransaction(tx,private)
                var tid = await web3.eth.sendSignedTransaction(signed.rawTransaction)
                
                var _tokenId = tid.logs[0].topics[3].toString()
                } catch(e){console.log(e)}
                _tokenId = parseInt(_tokenId)
                db.collection('tokens').updateOne({'address':fromAccount,'url':url,'year':year},{$set:{'tokenId':_tokenId}})

            })();

            res.redirect('tokencreate_success?_id='+_id)
        }
    })
} catch(e){console.log(e)}

})

app.get("/signup_success",(req,res)=>{

    res.render('signup_success')
})

app.get("/signup_fail",(req,res)=>{
    var address= req.query.address

    res.render('signup_fail')
})

app.get("/tokencreate_success",(req,res)=>{
    _id = req.query._id
    res.render('tokencreate_success',{_id:_id})
})

app.get("/tokencreate_fail",(req,res)=>{
    _id = req.query._id
    res.render('tokencreate_fail',{_id:_id})
})

app.get("/alltokens",(req,res)=>{
    
    _id = req.query._id
    db.collection('tokens').find({}).toArray(function(err,info){
        var tokens = info;
        res.render('alltokens',{tokens: tokens,_id:_id})
    });
    
})

app.post("/alltokens",(req,res)=>{
    try{
    var _id = req.query._id

    var private = req.body.private

    var tokenId = parseInt(req.body.tokenId)
    var newPrice = req.body.newPrice

    var fromAccountDetails= web3.eth.accounts.wallet.add(private)
    var fromAccount = fromAccountDetails.address

    db.collection('tokens').count({tokenId:tokenId}, function (findErr, result) {
        if (findErr) throw findErr;

        if(result<1){
            res.redirect('alltokens?_id='+_id)
        }
        else{            
            db.collection('tokens').findOne({tokenId:tokenId},function(findErr,result){

                var owner = result.address;
                var price = result.price.toString();

                (async()=>{
                    var nonce = await web3.eth.getTransactionCount(fromAccount)
                    
                    var encoded = contract.methods.buy_nft(tokenId, web3.utils.toWei(newPrice,'ether')).encodeABI()
                    var tx = {
                        to : contract_address,
                        data : encoded,
                        value : web3.utils.toWei(price,'ether').toString(),
                        gas : 300000,
                        nonce : nonce
                    }
                    try{
                        var signed = await web3.eth.accounts.signTransaction(tx,private)
                        await web3.eth.sendSignedTransaction(signed.rawTransaction)
                        } 
                    catch(e){console.log(e)}

                    nonce = await web3.eth.getTransactionCount(contract_owner)
                    encoded = contract.methods.sell_nft(tokenId,fromAccount,web3.utils.toWei(price,'ether')).encodeABI()   
                    var tx = {
                        to : contract_address,
                        data : encoded,
                        gas : 300000,
                        nonce : nonce
                    }  
                    try{
                        var signed = await web3.eth.accounts.signTransaction(tx,contract_private)
                        await web3.eth.sendSignedTransaction(signed.rawTransaction)
                        } 
                    catch(e){console.log(e)} 
                
                    nonce = await web3.eth.getTransactionCount(fromAccount)
                    encoded = contract.methods.setApproverForSale(tokenId).encodeABI()   
                    var tx = {
                        to : contract_address,
                        data : encoded,
                        gas : 300000,
                        nonce : nonce
                    }  
                    try{
                        var signed = await web3.eth.accounts.signTransaction(tx,private)
                        await web3.eth.sendSignedTransaction(signed.rawTransaction)
                        } 
                    catch(e){console.log(e)} 

                    var ownerOf = await contract.methods.getOwnerOf(tokenId).call()   
                    var priceOf = await contract.methods.getPrice(tokenId).call()   
                    console.log(ownerOf)   
                    console.log(priceOf)      
                    db.collection('tokens').updateOne({'tokenId':tokenId},{$set:{'address':ownerOf,'price':web3.utils.fromWei(priceOf[1])}})
                    res.redirect('home?_id='+_id) 

                    
                })();

            })
        }
        })
    } catch(e){console.log(e)}
    })
 
app.get("/",(req,res)=>{
    res.set({
        "Allow-access-Allow-Origin": '*'
    })
    return res.render('index');
});

app.listen(80)
console.log("Listening on PORT 80");

