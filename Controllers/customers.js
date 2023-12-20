const customers = require("../Models/customers");
const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");

const create_customer = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        name,
        email,
        phone,
        status,
        area,
        city,
        state,
        tax_number,
        country,
        branch,
      } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const data = new customers({
          name: name,
          email: email,
          phone: phone,
          area: area,
          city: city,
          state: state,
          tax_number: tax_number,
          country: country,
          status: status ? status : 0,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data.save();
        success_200(res, "Customer created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_customer = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        id,
        name,
        email,
        phone,
        status,
        area,
        city,
        state,
        tax_number,
        country,
        branch,
      } = req?.body;

      if (!id || !name) {
        incomplete_400(res);
      } else {
        const customer = await customers.findById(id);

        if (!customer) {
          failed_400(res, "User not found");
        } else {
          customer.name = name ? name : "";
          customer.email = email ? email : "";
          customer.phone = phone ? phone : "";
          customer.area = area ? area : "";
          customer.city = city ? city : "";
          customer.state = state ? state : "";
          customer.tax_number = tax_number ? tax_number : "";
          customer.country = country ? country : "";
          customer.status = status ? status : 0;
          customer.branch = branch ? branch : customer.branch;
          customer.updated = new Date();

          const dataToUpdate = await customer.save();
          success_200(res, "Customer Updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_customer = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const customer = await customers?.findById(id);

        if (!customer) {
          failed_400(res, "Customer not found");
        } else {
          success_200(res, "", customer);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
  }
};

const get_all_customers = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      let customersList = await customers?.find({ branch: authorize?.branch });
      success_200(res, "", customersList);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_customer,
  update_customer,
  get_customer,
  get_all_customers,
};
