const { authorization } = require("../Global/authorization");
const {
  incomplete_400,
  failed_400,
  success_200,
  unauthorized,
  catch_400,
} = require("../Global/errors");
const customers = require("../Models/customers");
const customers_log = require("../Models/customers_log");

const create_customer = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        name,
        email,
        phone,
        tax,
        area,
        city,
        state,
        country,
        status,
        branch,
      } = req?.body;

      if (!phone) {
        incomplete_400(res);
      } else {
        const selected_customer_phone = await customers?.findOne({
          phone: phone,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_customer_phone) {
          failed_400(res, "Customer exists");
        } else {
          const customer = new customers({
            name: name,
            email: email,
            phone: phone,
            tax: tax,
            area: area,
            city: city,
            state: state,
            country: country,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const customer_save = await customer?.save();
          success_200(res, "Customer created");
        }
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
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        name,
        email,
        phone,
        tax,
        area,
        city,
        state,
        country,
        status,
        branch,
      } = req?.body;

      if (!id || !phone) {
        incomplete_400(res);
      } else {
        const selected_customer = await customers?.findById(id);

        if (!selected_customer || selected_customer?.status == 2) {
          failed_400(res, "Customer not found");
        } else {
          const selected_customer_phone = await customers?.findOne({
            _id: { $ne: id },
            phone: phone,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_customer_phone) {
            failed_400(res, "Customer  exists");
          } else {
            const customer_log = new customers_log({
              customer: selected_customer?._id,
              name: selected_customer?.name,
              email: selected_customer?.email,
              phone: selected_customer?.phone,
              tax: selected_customer?.tax,
              area: selected_customer?.area,
              city: selected_customer?.city,
              state: selected_customer?.state,
              country: selected_customer?.country,
              status: selected_customer?.status,
              ref: selected_customer?.ref,
              branch: selected_customer?.branch,
              updated: new Date(),
              updated_by: authorize?.id,
            });
            const customer_log_save = await customer_log?.save();

            selected_customer.name = name;
            selected_customer.email = email;
            selected_customer.phone = phone;
            selected_customer.tax = tax;
            selected_customer.area = area;
            selected_customer.city = city;
            selected_customer.state = state;
            selected_customer.country = country;
            selected_customer.status = status ? status : 0;
            selected_customer.branch = branch ? branch : authorize?.branch;
            const customer_save = await selected_customer?.save();

            success_200(res, "Customer updated");
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_customer = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_customer = await customers?.findById(id);

        if (!selected_customer || selected_customer?.status == 2) {
          failed_400(res, "Customer not found");
        } else {
          const customer_log = new customers_log({
            customer: selected_customer?._id,
            name: selected_customer?.name,
            email: selected_customer?.email,
            phone: selected_customer?.phone,
            area: selected_customer?.area,
            city: selected_customer?.city,
            state: selected_customer?.state,
            country: selected_customer?.country,
            status: selected_customer?.status,
            ref: selected_customer?.ref,
            branch: selected_customer?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const customer_log_save = await customer_log?.save();

          selected_customer.status = 2;
          const customer_delete = await selected_customer?.save();

          success_200(res, "Customer deleted");
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
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_customer = await customers?.findById(id);

        if (!selected_customer || selected_customer?.status == 2) {
          failed_400(res, "Customer not found");
        } else {
          success_200(res, "", selected_customer);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_customers = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, status, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const customersList = { branch: authorize?.branch, status: { $ne: 2 } };

    if (search) {
      customersList.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      customersList.status = status;
    }
    if (status == 0) {
      customersList.status = status;
    }

    let sortOption = { name: 1 };
    if (sort == 0) {
      sortOption = { name: 1 };
    } else if (sort == 1) {
      sortOption = { name: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await customers.countDocuments(customersList);

    // Fetch paginated data
    const paginated_customers = await customers
      .find(customersList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_customers,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_customer_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_customer_log = await customers_log?.findById(id);

        if (!selected_customer_log) {
          failed_400(res, "Customer not found");
        } else {
          success_200(res, "", selected_customer_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_customers_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { customer } = req?.body;

      if (!customer) {
        incomplete_400(res);
      } else {
        const all_customers_log = await customers_log?.find({
          customer: customer,
        });
        success_200(res, "", all_customers_log);
      }
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
  delete_customer,
  get_customer,
  get_all_customers,
  get_customer_log,
  get_all_customers_log,
};
