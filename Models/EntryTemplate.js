// models/EntryTemplate.js
const mongoose = require("mongoose");

if(mongoose.models.EntryTemplate){
    module.exports = mongoose.model("EntryTemplate")
}else {
    const EntryTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  transactions: [{
    account: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('EntryTemplate', EntryTemplateSchema);
}

