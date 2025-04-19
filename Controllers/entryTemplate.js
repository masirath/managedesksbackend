const { authorization } = require("../Global/authorization");
const {
    incomplete_400,
    failed_400,
    success_200,
    unauthorized,
    catch_400,
  } = require("../Global/errors");;

const EntryTemplate = require("../Models/EntryTemplate");


const createEntryTemplate = async (req, res) => {
    try {
      const authorize = authorization(req);
      if (!authorize) return unauthorized(res);
  
      const { name, description, transactions } = req.body;
  
      if (!name || !transactions) {
        return incomplete_400(res, "Name and transactions are required");
      }
  
      const entryTemplate = new EntryTemplate({
        name,
        description,
        transactions,
        createdBy: authorize.id,
      });
  
      await entryTemplate.save();
      return success_200(res, "Entry template created successfully", entryTemplate);
    } catch (error) {
      return catch_400(res, error.message);
    }
  };

module.exports = {
    createEntryTemplate
}
// Add other CRUD operations (get, update, delete) as needed

