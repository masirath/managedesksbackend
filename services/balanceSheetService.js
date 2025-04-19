const Account = require("../Models/Account");
const BalanceSheet = require("../Models/BalanceSheet");
const GeneralLedger = require("../Models/GeneralLedger");

/**
 * Recursively builds a tree of accounts with their balances
 */
async function buildAccountTree(parentId = null, accountType = null, branch = null, reportDate) {
  const filter = { parentAccount: parentId };
  if (accountType) filter.account_type = accountType;
  if (branch) filter.branch = branch;

  const accounts = await Account.find(filter).lean();

  return Promise.all(
    accounts.map(async account => {
      const children = await buildAccountTree(account._id, null, branch, reportDate);
      const balance = await getAccountBalance(account._id, branch, reportDate);

      return {
        ...account,
        children,
        balance
      };
    })
  );
}

/**
 * Calculates account balance from General Ledger
 */
async function getAccountBalance(accountId, branch, reportDate) {
  const ledgerEntries = await GeneralLedger.find({
    account: accountId,
    branch,
    entry_date: { $lte: new Date(reportDate) }
  });

  return ledgerEntries.reduce((sum, entry) => {
    return sum + (entry.debit || 0) - (entry.credit || 0);
  }, 0);
}

/**
 * Recursively calculates total from an account tree
 */
function calculateTotal(accounts) {
  return accounts.reduce((sum, account) => {
    return sum + (account.balance || 0) + calculateTotal(account.children || []);
  }, 0);
}

/**
 * Main function to generate a balance sheet for a given date and branch
 */
async function generateBalanceSheet(reportDate, branch) {
  const [assets, liabilities, equity] = await Promise.all([
    buildAccountTree(null, "Assets", branch, reportDate),
    buildAccountTree(null, "Liabilities", branch, reportDate),
    buildAccountTree(null, "Equity", branch, reportDate)
  ]);

  const totals = {
    assets: calculateTotal(assets),
    liabilities: calculateTotal(liabilities),
    equity: calculateTotal(equity)
  };

  return BalanceSheet.create({
    branch,
    report_date: reportDate,
    assets,
    liabilities,
    equity,
    totals
  });
}

module.exports = {
  generateBalanceSheet
};
