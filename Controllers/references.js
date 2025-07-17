const { authorization } = require("../Global/authorization");
const {
  incomplete_400,
  failed_400,
  success_200,
  unauthorized,
  catch_400,
} = require("../Global/errors");
const references = require("../Models/references");

const create_reference = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        name,
        code,
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
        const selected_reference_phone = await references?.findOne({
          phone: phone,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_reference_phone) {
          failed_400(res, "Reference exists");
        } else {
          const reference = new references({
            name: name,
            code: code,
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

          const reference_save = await reference?.save();
          success_200(res, "Reference created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_reference = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        name,
        code,
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
        const selected_reference = await references?.findById(id);

        if (!selected_reference || selected_reference?.status == 2) {
          failed_400(res, "Reference not found");
        } else {
          const selected_reference_phone = await references?.findOne({
            _id: { $ne: id },
            phone: phone,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_reference_phone) {
            failed_400(res, "Reference  exists");
          } else {
            selected_reference.name = name;
            selected_reference.code = code;
            selected_reference.email = email;
            selected_reference.phone = phone;
            selected_reference.tax = tax;
            selected_reference.area = area;
            selected_reference.city = city;
            selected_reference.state = state;
            selected_reference.country = country;
            selected_reference.status = status ? status : 0;
            selected_reference.branch = branch ? branch : authorize?.branch;
            const reference_save = await selected_reference?.save();

            success_200(res, "Reference updated");
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

const delete_reference = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_reference = await references?.findById(id);

        if (!selected_reference || selected_reference?.status == 2) {
          failed_400(res, "Reference not found");
        } else {
          selected_reference.status = 2;
          const reference_delete = await selected_reference?.save();

          success_200(res, "Reference deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_reference = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_reference = await references?.findById(id);

        if (!selected_reference || selected_reference?.status == 2) {
          failed_400(res, "Reference not found");
        } else {
          success_200(res, "", selected_reference);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_references = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, status, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const referencesList = { branch: authorize?.branch, status: { $ne: 2 } };

    if (search) {
      referencesList.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      referencesList.status = status;
    }
    if (status == 0) {
      referencesList.status = status;
    }

    let sortOption = { name: 1 };
    if (sort == 0) {
      sortOption = { name: 1 };
    } else if (sort == 1) {
      sortOption = { name: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await references.countDocuments(referencesList);

    // Fetch paginated data
    const paginated_references = await references
      .find(referencesList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_references,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_reference,
  update_reference,
  delete_reference,
  get_reference,
  get_all_references,
};
