const ManualJournal = require("../Models/ManualJournal")
const Account = require("../Models/Account")


const getTrialBalanceReport = async (req, res) => {
    try {
        const { startDate, endDate, branch } = req.query;

        const matchStage = {
            status: "posted",
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            },
        };

        if (branch) matchStage["entries.branch"] = branch;

        const aggregation = await ManualJournal.aggregate([
            { $match: matchStage },
            { $unwind: "$entries" },
            {
                $lookup: {
                    from: "accounts",
                    localField: "entries.account",
                    foreignField: "_id",
                    as: "account",
                },
            },
            { $unwind: "$account" },
            {
                $group: {
                    _id: {
                        accountId: "$account._id",
                        name: "$account.name",
                        code: "$account.code",
                        accountType: "$account.type",
                        accountCategory: "$account.category",
                    },
                    debit: {
                        $sum: {
                            $cond: [{ $eq: ["$entries.type", "debit"] }, "$entries.amount", 0],
                        },
                    },
                    credit: {
                        $sum: {
                            $cond: [{ $eq: ["$entries.type", "credit"] }, "$entries.amount", 0],
                        },
                    },
                },
            },
            {
                $project: {
                    accountId: "$_id.accountId",
                    name: "$_id.name",
                    code: "$_id.code",
                    accountType: "$_id.accountType",         // <-- fix here
                    accountCategory: "$_id.accountCategory", // optional
                    debit: 1,
                    credit: 1,
                    _id: 0,
                },
            },
            { $sort: { code: 1 } },
        ]);

        const totalDebit = aggregation.reduce((sum, acc) => sum + (acc.debit || 0), 0);
        const totalCredit = aggregation.reduce((sum, acc) => sum + (acc.credit || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                accounts: aggregation,
                totalDebit,
                totalCredit,
            },
        });
    } catch (error) {
        console.error("Trial Balance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { getTrialBalanceReport };