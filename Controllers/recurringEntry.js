// controllers/recurringEntry.js
const { authorization } = require("../Global/authorization");
const {
    incomplete_400,
    failed_400,
    success_200,
    unauthorized,
    catch_400,
  } = require("../Global/errors");

const RecurringEntry = require("../Models/RecurringEntry");

const createRecurringEntry = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { frequency, nextDate, journalEntry } = req.body;

    if (!frequency || !nextDate || !journalEntry) {
      return incomplete_400(res, "Frequency, nextDate, and journalEntry are required");
    }

    const recurringEntry = new RecurringEntry({
      frequency,
      nextDate,
      journalEntry,
      createdBy: authorize.id,
    });

    await recurringEntry.save();
    return success_200(res, "Recurring entry created successfully", recurringEntry);
  } catch (error) {
    return catch_400(res, error.message);
  }
};

module.exports = {
    createRecurringEntry
}
// Add other CRUD operations (get, update, delete) as needed

