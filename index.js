"use strict";

// Dependencies
const randomString = require("randomstring")
const bcryptJS = require("bcryptjs")
const jsHashes = require("jshashes")
const express = require("express")
const moment = require("moment")
var gun = require("gun")

// Variables
const krypton = {
    peers: process.env.peers.join(",") || ["http://localhost:8162/gun"],
    adminKey: process.env.adminKey || "FAKFwio125195afawawffawfafwa51faf"
}

const web = express()
const port = process.env.PORT || 8080

const SHA512 = new jsHashes.SHA512
const salt = bcryptJS.genSaltSync(13)

gun = new gun({ peers: krypton.peers })

/// Configurations
// Express
web.use(express.json())

// Main
web.use((err, req, res, next)=>{
    if(err.message === "Bad request") return res.json({
        status: "failed",
        message: "Bad request."
    })

    next()
})

web.post("/generateCode", async(req, res)=>{
    const body = req.body

    if(body.adminKey !== krypton.adminKey) return res.json({
        status: "fail",
        message: "Invalid adminKey."
    })

    const code = randomString.generate(Math.floor(Math.random() * 10 + 15))

    await gun.get("krypton").get("codes").get(SHA512.hex(code)).put(true)

    res.json({
        status: "success",
        data: code
    })
})


web.post("/signup", async(req, res)=>{
    const body = req.body
    const username = SHA512.hex(body.username)
    const code = await gun.get("krypton").get("codes").get(SHA512.hex(body.code))

    if(!code) return res.json({
        status: "fail",
        message: "Invalid code."
    })

    const account = await gun.get("krypton555Accounts").get(username)

    if(account) return res.json({
        status: "fail",
        message: "Account already exists."
    })

    await gun.get("krypton555Accounts").get(username).put({
        username: username,
        password: bcryptJS.hashSync(body.password, salt),
        createdDate: moment().format("MMMM Do YYYY, h:mm:ss a")
    })

    await gun.get("krypton").get("codes").get(SHA512.hex(body.code)).put(null)

    res.json({
        status: "success",
        data: true
    })
})

web.post("/login", async(req, res)=>{
    const body = req.body
    const account = await gun.get("krypton555Accounts").get(SHA512.hex(body.username))

    if(!account || !bcryptJS.compareSync(body.password, account.password)) return res.json({
        status: "failed",
        message: "Invalid username/password."
    })

    res.json({
        status: "success",
        data: account
    })
})

web.listen(port, ()=>console.log(`Server is running. Port: ${port}`))