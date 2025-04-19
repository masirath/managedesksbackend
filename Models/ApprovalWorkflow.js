// models/ApprovalWorkflow.js
const mongoose = require("mongoose");

// Check if the model already exists
if(mongoose.models.ApprovalWorkflow){
    module.exports = mongoose.model("ApprovalWorkflow")
}else{
    const ApprovalWorkflowSchema = new mongoose.Schema({
  entry: { type: mongoose.Schema.Types.ObjectId, ref: 'ManualJournal', required: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ApprovalWorkflow', ApprovalWorkflowSchema);
}