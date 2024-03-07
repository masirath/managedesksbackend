const { authorization } = require("../Global/authorization");
const {
  unauthorized,
  incomplete_400,
  failed_400,
  success_200,
  catch_400,
} = require("../Global/errors");
const modules = require("../Models/modules");
const roles = require("../Models/roles");
const roles_details = require("../Models/roles_details");

const get_create_role = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const allModules = await modules?.find();
      success_200(res, "", allModules);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
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
          const existing_name = await roles.find({
            name: name,
            branch: authorize?.branch,
          });

          if (existing_name) {
            failed_400(res, "Role name exists");
          } else {
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
              const createRoleDetails = new roles_details({
                role_id: role?._id,
                module_id: value?.module_id,
                access: value?.access,
                create: value?.create,
                read: value?.read,
                update: value?.update,
                delete: value?.delete,
              });

              const roleDetail = await createRoleDetails?.save();
            }
            success_200(res, "Role created");
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
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
              const deleteRoleDetails = await roles_details?.deleteMany({
                role_id: existing_role?._id,
              });

              for (const value of details) {
                const createRoleDetails = new roles_details({
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
          success_200(res, "", role);
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
