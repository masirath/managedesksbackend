const ProfitLossSummary = require("../Models/ProfitLossSummary");
const accountingService = require("./accountingService");
const Transaction = require("../Models/Transaction");

const ManualJournal = require("../Models/ManualJournal")
const Account = require("../Models/Account")


const getProfitLossReport = async (req, res) => {
  try {
    const { startDate, endDate, branch } = req.query;

    const matchStage = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      accountType: { $in: ["Income", "Expense"] },
    };

    if (branch) {
      matchStage["branch"] = branch;
    }

    const aggregation = await Transaction.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "accounts",
          localField: "accountId",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },
      {
        $project: {
          amount: 1,
          entryType: 1,
          accountName: "$account.name",
          accountCode: "$account.code",
          category: "$account.category",
          accountType: "$accountType",
        },
      },
      {
        $group: {
          _id: {
            accountName: "$accountName",
            accountCode: "$accountCode",
            accountType: "$accountType",
          },
          total: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $and: [{ $eq: ["$accountType", "Income"] }, { $eq: ["$entryType", "credit"] }] },
                    { $and: [{ $eq: ["$accountType", "Expense"] }, { $eq: ["$entryType", "debit"] }] }
                  ]
                },
                "$amount",
                0
              ]
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.accountType",
          accounts: {
            $push: {
              name: "$_id.accountName",
              code: "$_id.accountCode",
              total: "$total"
            }
          },
          categoryTotal: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          accounts: 1,
          categoryTotal: 1
        }
      }
    ]);

    const income = aggregation.find(a => a.category === "Income") || { categoryTotal: 0 };
    const expenses = aggregation.find(a => a.category === "Expense") || { categoryTotal: 0 };
    const netProfit = income.categoryTotal - expenses.categoryTotal;

    res.status(200).json({
      success: true,
      data: {
        report: aggregation,
        incomeTotal: income.categoryTotal,
        expenseTotal: expenses.categoryTotal,
        netProfit,
      },
    });
  } catch (error) {
    console.error("Error generating Profit & Loss report:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {getProfitLossReport};
