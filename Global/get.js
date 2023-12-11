const items = require("../Models/items");
const customers = require("../Models/customers");

const getItem = async (id) => {
  try {
    const item = await items.findById(id);

    if (item) {
      return item;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

const getCustomer = async (id) => {
  try {
    const customer = await customers.findById(id);

    if (customer) {
      return customer;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

module.exports = { getItem, getCustomer };
