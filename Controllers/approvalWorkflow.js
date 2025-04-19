const { authorization } = require("../Global/authorization");
const {
    incomplete_400,
    failed_400,
    success_200,
    unauthorized,
    catch_400,
} = require("../Global/errors");

const ApprovalWorkflow = require("../Models/ApprovalWorkflow");
const ManualJournal = require("../Models/ManualJournal");
const User = require("../Models/users");

const createApprovalWorkflow = async (req, res) => {
    try {
        const authorize = authorization(req);
        if (!authorize) return unauthorized(res);

        const { entry, approver, comments } = req.body;

        if (!entry || !approver) {
            return incomplete_400(res, "Entry and approver are required");
        }

        // Check if entry and approver exist in DB
        const journalEntry = await ManualJournal.findById(entry);
        if (!journalEntry) return failed_400(res, "Journal Entry not found");

        const approverUser = await User.findById(approver);
        if (!approverUser) return failed_400(res, "Approver user not found");

        // Create approval workflow
        const approvalWorkflow = new ApprovalWorkflow({
            entry,
            approver,
            comments,
        });

        await approvalWorkflow.save();

        return success_200(res, "Approval workflow created successfully", approvalWorkflow);
    } catch (error) {
        return catch_400(res, error.message);
    }
};

module.exports = {
    createApprovalWorkflow
};
