const { authorization } = require("../Global/authorization");
const {
  unauthorized,
  incomplete_400,
  failed_400,
  success_200,
  catch_400,
} = require("../Global/errors");
const module_details = require("../Models/module_details");
const modules = require("../Models/modules");
const roles = require("../Models/roles");
const role_details = require("../Models/role_details");

const get_create_role = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const all_modules = await modules.find();

      let modules_data = [];
      for (const value of all_modules) {
        const module_detail = await module_details.find({
          module_id: value?._id,
        });

        let details = {
          _id: value?._id,
          name: value?.name,
          details: [...module_detail],
        };

        modules_data?.push(details);
      }

      success_200(res, "", modules_data);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_role = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { name, status, branch, details } = req?.body;

      if (!name || !details) {
        incomplete_400(res);
      } else {
        if (
          name?.toLowerCase() == "superadmin" ||
          name?.toLowerCase() == "admin"
        ) {
          failed_400(res, "Reserved role name");
        } else {
          const existing_name = await roles.findOne({
            name: name,
            branch: authorize?.branch,
          });

          if (existing_name) {
            failed_400(res, "Role name exists");
          } else {
            const all_module_details = await module_details?.find();

            if (all_module_details?.length == details?.length) {
              const createRole = new roles({
                name: name,
                status: status ? status : 0,
                branch: branch ? branch : authorize?.branch,
                ref: authorize?.ref,
                created: new Date(),
                updated: new Date(),
                created_by: authorize?._id,
              });

              const role = await createRole?.save();

              for (const value of details) {
                const createRoleDetails = new role_details({
                  role_id: role?._id,
                  module_id: value?.module_id,
                  access: value?.access ? value?.access : 0,
                  create: value?.create ? value?.create : 0,
                  read: value?.read ? value?.read : 0,
                  update: value?.update ? value?.update : 0,
                  delete: value?.delete ? value?.delete : 0,
                });

                const roleDetail = await createRoleDetails?.save();
              }
              success_200(res, "Role created");
            } else {
              failed_400(res, "Role detail missing");
            }
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

const update_role = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id, name, status, branch, details } = req?.body;

      if (!id || !name || !details) {
        incomplete_400(res);
      } else {
        if (
          name?.toLowerCase() == "superadmin" ||
          name?.toLowerCase() == "admin"
        ) {
          failed_400(res, "Reserved role name");
        } else {
          const existing_name = await roles.find({
            _id: { $ne: id },
            name: name,
            branch: authorize?.branch,
          });

          if (existing_name) {
            failed_400(res, "Role name exists");
          } else {
            const existing_role = await roles.findById(id);

            if (existing_role) {
              existing_role.name = name ? name : "";
              existing_role.status = status ? status : 0;
              existing_role.branch = branch ? branch : authorize?.branch;
              existing_role.updated = new Date();

              const updateRole = await existing_role?.save();
              const deleteRoleDetails = await role_details?.deleteMany({
                role_id: existing_role?._id,
              });

              for (const value of details) {
                const createRoleDetails = new role_details({
                  role_id: existing_role?._id,
                  module_id: value?.module_id,
                  access: value?.access,
                  create: value?.create,
                  read: value?.read,
                  update: value?.update,
                  delete: value?.delete,
                });

                const roleDetail = await createRoleDetails?.save();
              }

              success_200(res, "Role Updated");
            } else {
              failed_400(res, "Role not found");
            }
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

const get_role = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const role = await roles.findById(id);

        if (role) {
          const roleDetails = await role_details
            .find({
              role_id: role?._id,
            })
            .populate("module_id");

          const roleData = {
            role: role,
            role_details: roleDetails,
          };

          success_200(res, "", { role, roleDetails });
        } else {
          failed_400(res, "Role not found");
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
    if (authorize) {
      const all_roles = await roles.find({ branch: authorize?.branch });
      success_200(res, "", all_roles);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_create_role,
  create_role,
  update_role,
  get_role,
  get_all_roles,
};
