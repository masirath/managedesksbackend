const Account = require("../Models/Account");
const JournalEntry = require("../Models/ManualJournal");
const Transaction = require("../Models/Transaction");
const PeriodClosing = require("../Models/PeriodClosing");

/**
 * Recursively builds a tree of P&L accounts with their balances
 */
async function buildPLAccountTree(parentId = null, branch = null, startDate, endDate) {
  const filter = { 
    parentAccount: parentId,
    category: { $in: ["Income", "Expenses"] }
  };
  if (branch) filter.branch = branch;

  const accounts = await Account.find(filter).lean();

  return Promise.all(
    accounts.map(async account => {
      const children = await buildPLAccountTree(account._id, branch, startDate, endDate);
      const balance = await getAccountPeriodBalance(account._id, branch, startDate, endDate);

      return {
        ...account,
        children,
        periodBalance: balance
      };
    })
  );
}

/**
 * Calculates account balance for a specific period
 */
async function getAccountPeriodBalance(accountId, branch, startDate, endDate) {
  const transactions = await Transaction.find({
    accountId,
    branch,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });

  return transactions.reduce((sum, txn) => {
    return sum + (txn.type === 'debit' ? -txn.amount : txn.amount);
  }, 0);
}

/**
 * Closes an accounting period and resets P&L accounts
 */
async function closeAccountingPeriod(periodDate, userId, branch) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const startDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const endDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

    // 1. Get all P&L accounts
    const plAccounts = await Account.find({
      category: { $in: ["Income", "Expenses"] },
      branch
    }).session(session);

    // 2. Calculate period totals
    const closingEntries = await Promise.all(
      plAccounts.map(async account => {
        const balance = await getAccountPeriodBalance(account._id, branch, startDate, endDate);
        return {
          accountId: account._id,
          debitAmount: balance < 0 ? Math.abs(balance) : 0,
          creditAmount: balance > 0 ? balance : 0
        };
      })
    );

    // 3. Create closing record
    await PeriodClosing.create([{
      period: startDate,
      branch,
      isClosed: true,
      closingEntries,
      closedBy: userId
    }], { session });

    // 4. Reset P&L account balances
    await Account.updateMany(
      { _id: { $in: plAccounts.map(a => a._id) }, branch },
      { $set: { balance: 0 } },
      { session }
    );

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  buildPLAccountTree,
  getAccountPeriodBalance,
  closeAccountingPeriod
};