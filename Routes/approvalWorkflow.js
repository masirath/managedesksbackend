const express = require("express");
const {createApprovalWorkflow} = require("../Controllers/approvalWorkflow")


const  approvalWorkflow= express.Router()

approvalWorkflow?.post("/api/create-approval-workflow", createApprovalWorkflow)

module.exports =approvalWorkflow

