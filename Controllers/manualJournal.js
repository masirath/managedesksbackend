const ManualJournal = require("../Models/ManualJournal");
const GeneralLedger = require("../Models/GeneralLedger")
const ChartOfAccounts = require("../Models/Account")
const { generateBalanceSheet } = require("../services/balanceSheetService");


const {
  success_200,
  failed_400,
  incomplete_400,
  unauthorized,
  catch_400,
} = require("../Global/responseHandlers");
const { authorization } = require("../Global/authorization");

/**
 * Validate Journal Entry: Ensures debits = credits.
 */
const validateJournalEntry = (entries) => {
  if (!entries || entries.length < 2) {
    return { valid: false, message: "At least two entries (one debit and one credit) are required" };
  }

  const debits = entries.filter(e => e.type === 'debit');
  const credits = entries.filter(e => e.type === 'credit');

  if (debits.length === 0 || credits.length === 0) {
    return { valid: false, message: "Must have at least one debit and one credit entry" };
  }

  const totalDebits = debits.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
  const totalCredits = credits.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

  return Math.abs(totalDebits - totalCredits) < 0.01
    ? { valid: true }
    : { valid: false, message: `Total debits (${totalDebits}) must equal total credits (${totalCredits})` };
};

const validateAccountTypes = async (entries) => {
  const invalidEntries = [];

  for (const entry of entries) {
    const account = await ChartOfAccounts.findById(entry.account);
    if (!account) {
      invalidEntries.push(`Account not found for entry: ${entry.account}`);
      continue;
    }

    // OPTIONAL: You can still warn if the entry is uncommon (not invalid)
    if (entry.type === 'debit' && ["Liabilities", "Equity", "Income"].includes(account.category)) {
      invalidEntries.push(`Cannot debit ${account.category} account: ${account.name}`);
    }

    // ❌ REMOVE this block — it's not valid accounting logic
    // if (entry.type === 'credit' && ["Assets", "Expenses"].includes(account.category)) {
    //   invalidEntries.push(`Cannot credit ${account.category} account: ${account.name}`);
    // }
  }

  return invalidEntries.length === 0 
    ? { valid: true }
    : { valid: false, messages: invalidEntries };
};


const create_manual_journal = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    // Debug received data
    console.log('Received data:', req.body);

    const { date, description, documents = [], entries, referenceNumber } = req.body;

    // Validate required fields
    const requiredFields = ['date', 'description', 'entries', 'referenceNumber'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
        receivedData: req.body
      });
    }

    // Validate journal entries structure
    const journalValidation = validateJournalEntry(entries);
    if (!journalValidation.valid) {
      return failed_400(res, journalValidation.message);
    }

    // Validate account types
    const accountValidation = await validateAccountTypes(entries);
    if (!accountValidation.valid) {
      return failed_400(res, accountValidation.messages.join(", "));
    }

    // Create new journal entry
    const journalData = {
      date,
      description,
      referenceNumber,
      documents,
      entries: entries.map(entry => ({
        account: entry.account,
        amount: parseFloat(entry.amount),
        type: entry.type,
        reference: entry.reference || `${entry.type === 'debit' ? 'DR' : 'CR'}-${referenceNumber}`,
        description: entry.description || ''
      })),
      status: 'posted',
      created_by: authorize?.id, 
    };

    const journalEntry = new ManualJournal(journalData);
    const newJournalEntry = await journalEntry.save();
    const ledgerEntries = [];

    // Process ledger entries
    for (const entry of newJournalEntry.entries) {
      const accountDetails = await ChartOfAccounts.findById(entry.account);
      if (!accountDetails) {
        return failed_400(res, `Invalid account: ${entry.account}`);
      }

      const lastEntry = await GeneralLedger.findOne({ account: entry.account })
        .sort({ createdAt: -1 });
      
      const currentBalance = lastEntry ? lastEntry.balance : 0;
      let newBalance, debitAmount = 0, creditAmount = 0;

      if (entry.type === 'debit') {
        debitAmount = entry.amount;
        if (["Assets", "Expenses"].includes(accountDetails.category)) {
          newBalance = currentBalance + debitAmount;
        } else {
          newBalance = currentBalance - debitAmount;
          if (newBalance < 0) {
            return failed_400(res, `Insufficient balance in ${accountDetails.name} (${accountDetails.code})`);
          }
        }
      } else { // credit
        creditAmount = entry.amount;
        if (["Liabilities", "Equity", "Income"].includes(accountDetails.category)) {
          newBalance = currentBalance + creditAmount;
        } else {
          newBalance = currentBalance - creditAmount;
          if (newBalance < 0) {
            return failed_400(res, `Insufficient balance in ${accountDetails.name} (${accountDetails.code})`);
          }
        }
      }

      const ledgerEntry = new GeneralLedger({
        journalEntryId: newJournalEntry._id,
        account: entry.account,
        account_name: accountDetails.name,
        account_code: accountDetails.code,
        debit: debitAmount,
        credit: creditAmount,
        balance: newBalance,
        date: newJournalEntry.date,
        description: [newJournalEntry.description, entry.description].filter(Boolean).join(" | "),
        reference: entry.reference,
        documentRef: documents[0]?.url, // Reference first document if exists
        created_by: authorize.id
      });
      
      await ledgerEntry.save();
      ledgerEntries.push(ledgerEntry);
      
       // In your journal entry controller after saving entries:
      await ChartOfAccounts.updateBalances(journalEntry); 
      // Update account balance
      accountDetails.balance = newBalance;
      await accountDetails.save();
    }
 // Step 3: Auto-generate balance sheet after successful journal entry
 try {
  await generateBalanceSheet(new Date());
} catch (balanceSheetError) {
  console.error("Balance sheet generation failed:", balanceSheetError);
  // Don't fail the whole request, just log the error
}
    return success_200(res, "Journal entry created successfully", {
      journalEntry: newJournalEntry,
      ledgerEntries,
    });

  } catch (error) {
    console.error("Full error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      validationErrors: error.errors,
      receivedData: req.body
    });
    return res.status(400).json({
      success: false,
      message: error.message,
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
};

const get_all_manual_journals = async (req, res) => {
  try {
    // 1. Authorization Check
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    // 2. Debug: Log the request query (for troubleshooting)
    console.log("Request Query:", req.query);

    // 3. Pagination Setup (with safeguards)
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.min(limit, 100); // Cap at 100 per page
    page = Math.max(page, 1); // Ensure page >= 1

    // 4. Extract and sanitize filters
    const { branch, search, status, startDate, endDate } = req.query;

    // 5. Base Query: Restrict to user's entries
    const query = { created_by: authorize.id };

    // 6. Apply Filters (if provided)
    if (branch) query.branch = branch;

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { entryId: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query["approval.status"] = status;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 7. Debug: Log the final query (critical for troubleshooting)
    console.log("Final MongoDB Query:", JSON.stringify(query, null, 2));

    // 8. Fetch Data (with error handling for empty results)
    const [totalCount, journalEntries] = await Promise.all([
      ManualJournal.countDocuments(query),
      ManualJournal.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("entries.account", "name code")
        .sort({ createdAt: -1 })
        .lean(), // Use .lean() for faster plain JS objects
    ]);

    // 9. Debug: Log the count and sample data
    console.log(`Total documents found: ${totalCount}`);
    if (journalEntries.length > 0) {
      console.log("Sample document:", journalEntries[0]);
    } else {
      console.warn("No documents matched the query.");
    }

    // 10. Return Response
    return res.status(200).json({
      success: true,
      message: "Manual journal entries retrieved successfully",
      data: journalEntries,
      meta: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        pageSize: limit,
      },
    });

  } catch (error) {
    console.error("Error in get_all_manual_journals:", error);
    return catch_400(res, error.message);
  }
};

/**
 * Get a specific manual journal entry by ID.
 */
const get_manual_journal = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { id } = req.params;
    if (!id) return incomplete_400(res, "Journal entry ID is required");

    const journalEntry = await ManualJournal.findById(id)
    .populate("entries.account", "name code"); 
   
    if (!journalEntry || journalEntry.created_by.toString() !== authorize.id) {
      return failed_400(res, "Manual journal entry not found or unauthorized access");
    }

    return success_200(res, "Manual journal entry retrieved successfully", journalEntry);
  } catch (error) {
    return catch_400(res, error.message);
  }
};

/**
 * Update a manual journal entry by ID.
 */
// const update_manual_journal = async (req, res) => {
//   try {
//     const authorize = authorization(req);
//     if (!authorize) return unauthorized(res);

//     const { id } = req.params;
//     const { description, debits, credits } = req.body;

//     // Validate required fields
//     if (!description || !debits || !credits) {
//       return incomplete_400(res, "Description, debits, and credits are required");
//     }

//     // Validate journal entry
//     const validation = validateJournalEntry(debits, credits);
//     if (!validation.valid) return failed_400(res, validation.message);

//     const updatedJournalEntry = await ManualJournal.findOneAndUpdate(
//       { _id: id, created_by: authorize.id }, // Ensure only the creator can update
//       { description, debits, credits },
//       { new: true, runValidators: true }
//     );

//     if (!updatedJournalEntry) {
//       return failed_400(res, "Manual journal entry not found or unauthorized access");
//     }

//     return success_200(res, "Manual journal entry updated successfully", updatedJournalEntry);
//   } catch (error) {
//     return catch_400(res, error.message);
//   }
// };

/**
 * Delete a manual journal entry by ID.
 */
const delete_manual_journal = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { id } = req.params;
    if (!id) return incomplete_400(res, "Journal entry ID is required");

    const deletedJournalEntry = await ManualJournal.findOneAndDelete({ _id: id, created_by: authorize.id });

    if (!deletedJournalEntry) {
      return failed_400(res, "Manual journal entry not found or unauthorized access");
    }

    return success_200(res, "Manual journal entry deleted successfully");
  } catch (error) {
    return catch_400(res, error.message);
  }
};

module.exports = {
  create_manual_journal,
  get_all_manual_journals,
  get_manual_journal,
  // update_manual_journal,
  delete_manual_journal,
};