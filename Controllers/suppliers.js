const suppliers = require("../Models/suppliers");
const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");

const create_supplier = async (req, res) => {
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
        const data = new suppliers({
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
        success_200(res, "Supplier created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_supplier = async (req, res) => {
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
        const supplier = await suppliers.findById(id);

        if (!supplier) {
          failed_400(res, "User not found");
        } else {
          supplier.name = name ? name : "";
          supplier.email = email ? email : "";
          supplier.phone = phone ? phone : "";
          supplier.area = area ? area : "";
          supplier.city = city ? city : "";
          supplier.state = state ? state : "";
          supplier.tax_number = tax_number ? tax_number : "";
          supplier.country = country ? country : "";
          supplier.status = status ? status : 0;
          supplier.branch = branch ? branch : supplier.branch;
          supplier.updated = new Date();

          const dataToUpdate = await supplier.save();
          success_200(res, "Supplier Updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_supplier = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const supplier = await suppliers?.findById(id);

        if (!supplier) {
          failed_400(res, "Supplier not found");
        } else {
          success_200(res, "", supplier);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
  }
};

const get_all_suppliers = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      let suppliersList = await suppliers?.find({ branch: authorize?.branch });
      success_200(res, "", suppliersList);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_supplier,
  update_supplier,
  get_supplier,
  get_all_suppliers,
};
