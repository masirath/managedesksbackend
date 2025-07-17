require("dotenv").config();
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const roles = require("../Models/roles");
const roles_details = require("../Models/roles_details");

const create_role = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, status, details, branch } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const selected_role_name = await roles?.findOne({
          name: name,
          branch: authorize?.branch,
        });

        if (selected_role_name) {
          failed_400(res, "Role name exists");
        } else {
          const role = new roles({
            name: name,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const role_save = await role?.save();

          if (details?.length > 0) {
            for (value of details) {
              const role_details = new roles_details({
                role: role_save?._id,
                name: value?.name,
                full_access: value?.full_access,
                view: value?.view,
                create: value?.create,
                update: value?.update,
                delete: value?.delete,
                approve: value?.approve,
                status: status ? status : 0,
                ref: authorize?.ref,
                branch: branch ? branch : authorize?.branch,
                created: new Date(),
                created_by: authorize?.id,
              });

              const role_details_save = await role_details?.save();
            }
          }

          success_200(res, "Role created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_role = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { id, name, status, details, branch } = req?.body;

    if (!id || !name) {
      incomplete_400(res);
    } else {
      const selected_role = await roles?.findById(id);

      if (!selected_role || selected_role.status == 2) {
        failed_400(res, "Role not found");
      } else {
        const selected_role_name = await roles?.findOne({
          _id: { $ne: id },
          name: name,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_role_name) {
          failed_400(res, "Role name exists");
        } else {
          selected_role.name = name;
          selected_role.status = status ? status : 0;
          selected_role.branch = branch ? branch : authorize?.branch;

          const role_update = await selected_role?.save();

          const delete_role_details = await roles_details?.deleteMany({
            role: id,
          });

          if (details?.length > 0) {
            for (value of details) {
              const role_details = new roles_details({
                role: role_update?._id,
                name: value?.name,
                full_access: value?.full_access,
                view: value?.view,
                create: value?.create,
                update: value?.update,
                delete: value?.delete,
                approve: value?.approve,
                status: status ? status : 0,
                ref: authorize?.ref,
                branch: branch ? branch : authorize?.branch,
                created: new Date(),
                created_by: authorize?.id,
              });

              const role_details_save = await role_details?.save();
            }
          }

          success_200(res, "Role updated");
        }
      }
    }

    if (authorize) {
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_role = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id, status } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_role = await roles?.findById(id);

        if (!selected_role) {
          failed_400(res, "Role not found");
        } else {
          selected_role.status = 2;
          const role_delete = selected_role?.save();
          success_200(res, "Role deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_role = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_roles = await roles?.findById(id);

        if (!selected_roles) {
          failed_400(res, "Roles not found");
        } else {
          let role = selected_roles?.toObject();
          const role_details = await roles_details?.find({ role: role?._id });

          let all_roles_details = {
            ...role,
            details: role_details,
          };

          success_200(res, "", all_roles_details);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_roles = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, status, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    // const productRoleList = { branch: authorize?.branch, status: { $ne: 2 } };
    const productRoleList = { ref: authorize?.ref, status: { $ne: 2 } };

    if (search) {
      productRoleList.name = { $regex: search, $options: "i" };
    }
    if (status) {
      productRoleList.status = status;
    }

    // Get total count for pagination metadata
    const totalCount = await roles.countDocuments(productRoleList);

    // Fetch paginated data
    const paginated_roles = await roles
      .find(productRoleList)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_roles,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_role_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_role_log = await roles_log?.findById(id);

        if (!selected_role_log) {
          failed_400(res, "Role log not found");
        } else {
          success_200(res, "", selected_role_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_role_logs = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { search } = req?.body;

    if (authorize) {
      const { role } = req?.body;

      if (!role) {
        incomplete_400(res);
      } else {
        const all_role_logs = await roles_log?.find({
          role: role,
        });
        success_200(res, "", all_role_logs);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_role,
  update_role,
  delete_role,
  get_role,
  get_all_roles,
  get_role_log,
  get_all_role_logs,
};
